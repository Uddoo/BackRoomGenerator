import * as THREE from "three";
import { resolveMovement } from "../game/collision";
import type { GeneratedMap, WorldPoint } from "../game/types";

const PLAYER_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.38;
const WALK_SPEED = 3.35;
const RUN_SPEED = 5.55;
const LOOK_SPEED = 0.0022;
const MAX_PITCH = Math.PI / 2 - 0.08;

export class FirstPersonController {
  private yaw = 0;
  private pitch = 0;
  private bobTime = 0;
  private readonly forwardVector = new THREE.Vector3();
  private readonly rightVector = new THREE.Vector3();
  private readonly pressed = new Set<string>();

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

  lock(): void {
    this.canvas.requestPointerLock();
  }

  teleport(point: WorldPoint, yaw = 0): void {
    this.yaw = yaw;
    this.pitch = 0;
    this.camera.position.set(point.x, PLAYER_HEIGHT, point.z);
    this.applyRotation();
  }

  update(deltaSeconds: number, map: GeneratedMap): void {
    if (!this.locked) {
      return;
    }

    const forward = Number(this.isPressed("KeyW") || this.isPressed("ArrowUp")) -
      Number(this.isPressed("KeyS") || this.isPressed("ArrowDown"));
    const strafe = Number(this.isPressed("KeyD") || this.isPressed("ArrowRight")) -
      Number(this.isPressed("KeyA") || this.isPressed("ArrowLeft"));
    const length = Math.hypot(forward, strafe);

    if (length === 0) {
      this.camera.position.y += (PLAYER_HEIGHT - this.camera.position.y) * Math.min(deltaSeconds * 10, 1);
      return;
    }

    const normalizedForward = forward / length;
    const normalizedStrafe = strafe / length;
    const speed = this.isPressed("ShiftLeft") || this.isPressed("ShiftRight") ? RUN_SPEED : WALK_SPEED;
    const distance = speed * deltaSeconds;

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
      if (!this.locked) {
        this.lock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      const locked = this.locked;
      this.onLockChange(locked);
      if (!locked) {
        this.pressed.clear();
      }
    });

    document.addEventListener("mousemove", (event) => {
      if (!this.locked) {
        return;
      }

      this.yaw -= event.movementX * LOOK_SPEED;
      this.pitch -= event.movementY * LOOK_SPEED;
      this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
      this.applyRotation();
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

  private applyRotation(): void {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }
}
