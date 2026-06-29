import * as THREE from "three";
import { resolveMovement } from "../game/collision";
import type { GeneratedMap, WorldPoint } from "../game/types";

const PLAYER_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.38;
const WALK_SPEED = 3.35;
const RUN_SPEED = 5.55;
const LOOK_SPEED = 0.0022;
const TOUCH_LOOK_SPEED = 0.004;
const MAX_PITCH = Math.PI / 2 - 0.08;

export interface TouchControlElements {
  moveZone: HTMLElement;
  moveKnob: HTMLElement;
  lookZone: HTMLElement;
  runButton: HTMLButtonElement;
}

export class FirstPersonController {
  private yaw = 0;
  private pitch = 0;
  private bobTime = 0;
  private readonly forwardVector = new THREE.Vector3();
  private readonly rightVector = new THREE.Vector3();
  private readonly pressed = new Set<string>();
  private readonly touchMove = new THREE.Vector2();
  private touchEnabled = false;
  private touchEngaged = false;
  private touchRun = false;
  private movePointerId: number | null = null;
  private lookPointerId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly onLockChange: (locked: boolean) => void
  ) {
    this.bindEvents();
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  get active(): boolean {
    return this.locked || this.touchEngaged;
  }

  setTouchEnabled(enabled: boolean): void {
    this.touchEnabled = enabled;
    if (!enabled && this.touchEngaged) {
      this.touchEngaged = false;
      this.onLockChange(this.active);
    }
  }

  lock(): void {
    this.canvas.requestPointerLock();
  }

  start(): void {
    if (this.touchEnabled) {
      this.touchEngaged = true;
      this.canvas.focus();
      this.onLockChange(this.active);
      return;
    }

    this.lock();
  }

  bindTouchControls(elements: TouchControlElements): void {
    elements.moveZone.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.touchEngaged = true;
      this.movePointerId = event.pointerId;
      elements.moveZone.setPointerCapture(event.pointerId);
      this.updateTouchMove(event, elements);
      this.onLockChange(this.active);
    });

    elements.moveZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.movePointerId) {
        return;
      }

      event.preventDefault();
      this.updateTouchMove(event, elements);
    });

    const stopMove = (event: PointerEvent): void => {
      if (event.pointerId !== this.movePointerId) {
        return;
      }

      this.movePointerId = null;
      this.touchMove.set(0, 0);
      elements.moveKnob.style.transform = "translate(-50%, -50%)";
    };

    elements.moveZone.addEventListener("pointerup", stopMove);
    elements.moveZone.addEventListener("pointercancel", stopMove);
    elements.moveZone.addEventListener("lostpointercapture", stopMove);

    elements.lookZone.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.touchEngaged = true;
      this.lookPointerId = event.pointerId;
      this.lookLastX = event.clientX;
      this.lookLastY = event.clientY;
      elements.lookZone.setPointerCapture(event.pointerId);
      this.onLockChange(this.active);
    });

    elements.lookZone.addEventListener("pointermove", (event) => {
      if (event.pointerId !== this.lookPointerId) {
        return;
      }

      event.preventDefault();
      this.applyLookDelta(
        (event.clientX - this.lookLastX) * TOUCH_LOOK_SPEED,
        (event.clientY - this.lookLastY) * TOUCH_LOOK_SPEED
      );
      this.lookLastX = event.clientX;
      this.lookLastY = event.clientY;
    });

    const stopLook = (event: PointerEvent): void => {
      if (event.pointerId === this.lookPointerId) {
        this.lookPointerId = null;
      }
    };

    elements.lookZone.addEventListener("pointerup", stopLook);
    elements.lookZone.addEventListener("pointercancel", stopLook);
    elements.lookZone.addEventListener("lostpointercapture", stopLook);

    const setRun = (running: boolean): void => {
      this.touchRun = running;
      elements.runButton.classList.toggle("is-active", running);
      elements.runButton.setAttribute("aria-pressed", String(running));
    };

    elements.runButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.touchEngaged = true;
      elements.runButton.setPointerCapture(event.pointerId);
      setRun(true);
      this.onLockChange(this.active);
    });
    elements.runButton.addEventListener("pointerup", () => setRun(false));
    elements.runButton.addEventListener("pointercancel", () => setRun(false));
    elements.runButton.addEventListener("lostpointercapture", () => setRun(false));
  }

  teleport(point: WorldPoint, yaw = 0): void {
    this.yaw = yaw;
    this.pitch = 0;
    this.camera.position.set(point.x, PLAYER_HEIGHT, point.z);
    this.applyRotation();
  }

  update(deltaSeconds: number, map: GeneratedMap): void {
    if (!this.active) {
      return;
    }

    const forwardInput = Number(this.isPressed("KeyW") || this.isPressed("ArrowUp")) -
      Number(this.isPressed("KeyS") || this.isPressed("ArrowDown")) -
      this.touchMove.y;
    const strafeInput = Number(this.isPressed("KeyD") || this.isPressed("ArrowRight")) -
      Number(this.isPressed("KeyA") || this.isPressed("ArrowLeft")) +
      this.touchMove.x;
    const inputLength = Math.hypot(forwardInput, strafeInput);
    const movementScale = Math.min(1, inputLength);

    if (inputLength === 0) {
      this.camera.position.y += (PLAYER_HEIGHT - this.camera.position.y) * Math.min(deltaSeconds * 10, 1);
      return;
    }

    const normalizedForward = forwardInput / inputLength;
    const normalizedStrafe = strafeInput / inputLength;
    const speed = this.isPressed("ShiftLeft") || this.isPressed("ShiftRight") || this.touchRun ? RUN_SPEED : WALK_SPEED;
    const distance = speed * deltaSeconds * movementScale;

    this.camera.getWorldDirection(this.forwardVector);
    this.forwardVector.y = 0;
    this.forwardVector.normalize();
    this.rightVector.crossVectors(this.forwardVector, this.camera.up).normalize();

    const dx = (this.forwardVector.x * normalizedForward + this.rightVector.x * normalizedStrafe) * distance;
    const dz = (this.forwardVector.z * normalizedForward + this.rightVector.z * normalizedStrafe) * distance;
    const next = resolveMovement(
      map,
      { x: this.camera.position.x, z: this.camera.position.z },
      dx,
      dz,
      PLAYER_RADIUS
    );

    this.camera.position.x = next.x;
    this.camera.position.z = next.z;
    this.bobTime += deltaSeconds * speed;
    this.camera.position.y = PLAYER_HEIGHT + Math.sin(this.bobTime * 8.5) * 0.028;
  }

  private bindEvents(): void {
    this.canvas.addEventListener("click", () => {
      if (!this.locked && !this.touchEnabled) {
        this.lock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      const locked = this.locked;
      this.onLockChange(this.active);
      if (!locked) {
        this.pressed.clear();
      }
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.locked) {
        return;
      }

      this.applyLookDelta(event.movementX * LOOK_SPEED, event.movementY * LOOK_SPEED);
    });

    window.addEventListener("keydown", (event) => {
      this.pressed.add(event.code);
    });

    window.addEventListener("keyup", (event) => {
      this.pressed.delete(event.code);
    });

    window.addEventListener("blur", () => {
      this.pressed.clear();
    });
  }

  private isPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  private updateTouchMove(event: PointerEvent, elements: TouchControlElements): void {
    const bounds = elements.moveZone.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const maxDistance = Math.max(24, Math.min(bounds.width, bounds.height) * 0.36);
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const rawLength = Math.hypot(rawX, rawY);
    const scale = rawLength > maxDistance ? maxDistance / rawLength : 1;
    const knobX = rawX * scale;
    const knobY = rawY * scale;

    this.touchMove.set(knobX / maxDistance, knobY / maxDistance);
    elements.moveKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
  }

  private applyLookDelta(deltaX: number, deltaY: number): void {
    this.yaw -= deltaX;
    this.pitch -= deltaY;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
    this.applyRotation();
  }

  private applyRotation(): void {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }
}
