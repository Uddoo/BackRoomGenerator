import * as THREE from "three";
import { cellToWorld } from "../game/generator";
import type { GeneratedMap, GridPoint } from "../game/types";
import { createBackroomsMaterials, disposeMaterials, type BackroomsMaterials } from "./textures";

const WALL_HEIGHT = 2.85;
const WALL_THICKNESS = 0.18;
const PLAYER_HEIGHT = 1.62;

export interface SceneStats {
  wallCount: number;
  floorCount: number;
  ceilingCount: number;
  lightCount: number;
  pillarCount: number;
  drawCalls: number;
}

export interface BackroomsSceneOptions {
  preserveDrawingBuffer?: boolean;
}

export class BackroomsScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;

  private readonly scene = new THREE.Scene();
  private readonly worldGroup = new THREE.Group();
  private readonly dummy = new THREE.Object3D();
  private readonly materials: BackroomsMaterials;
  private readonly resizeObserver: ResizeObserver;
  private stats: SceneStats = {
    wallCount: 0,
    floorCount: 0,
    ceilingCount: 0,
    lightCount: 0,
    pillarCount: 0,
    drawCalls: 0
  };

  constructor(
    private readonly container: HTMLElement,
    options: BackroomsSceneOptions = {}
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.tabIndex = 0;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 150);
    this.camera.position.set(0, PLAYER_HEIGHT, 0);
    this.scene.add(this.camera);

    this.materials = createBackroomsMaterials();
    this.scene.background = new THREE.Color("#090806");
    this.scene.fog = new THREE.FogExp2("#2b2718", 0.023);
    this.scene.add(this.worldGroup);
    this.addLighting();
    this.bindContextLossGuard();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  setMap(map: GeneratedMap): void {
    this.clearWorld();
    const floorMesh = this.createFloorMesh(map);
    const ceilingMesh = this.createCeilingMesh(map);
    const wallMesh = this.createWallMesh(map);
    const lightMesh = this.createLightMesh(map);
    const pillarMesh = this.createPillarMesh(map);
    const exitDoor = this.createExitDoor(map);

    this.worldGroup.add(floorMesh, ceilingMesh, wallMesh, lightMesh, pillarMesh, exitDoor);

    const spawn = cellToWorld(map, map.spawn);
    this.camera.position.set(spawn.x, PLAYER_HEIGHT, spawn.z);
    this.camera.rotation.set(0, 0, 0);

    this.stats = {
      wallCount: map.wallSegments.length,
      floorCount: map.openCount,
      ceilingCount: map.openCount,
      lightCount: countCells(map.lights),
      pillarCount: countCells(map.pillars),
      drawCalls: 0
    };
  }

  render(): SceneStats {
    this.renderer.render(this.scene, this.camera);
    this.stats.drawCalls = this.renderer.info.render.calls;
    return this.stats;
  }

  dispose(): void {
    this.clearWorld();
    disposeMaterials(this.materials);
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private createFloorMesh(map: GeneratedMap): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(map.cellSize, 0.05, map.cellSize);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.floor, map.openCount);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    let instance = 0;

    forEachOpenCell(map, (point) => {
      const world = cellToWorld(map, point);
      this.dummy.position.set(world.x, -0.03, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(instance, this.dummy.matrix);
      instance += 1;
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createCeilingMesh(map: GeneratedMap): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(map.cellSize, 0.05, map.cellSize);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.ceiling, map.openCount);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    let instance = 0;

    forEachOpenCell(map, (point) => {
      const world = cellToWorld(map, point);
      this.dummy.position.set(world.x, WALL_HEIGHT + 0.03, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(instance, this.dummy.matrix);
      instance += 1;
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createWallMesh(map: GeneratedMap): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(map.cellSize, WALL_HEIGHT, WALL_THICKNESS);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.wall, map.wallSegments.length);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for (let instance = 0; instance < map.wallSegments.length; instance += 1) {
      const segment = map.wallSegments[instance];
      const world = cellToWorld(map, segment);
      const offset = map.cellSize / 2;
      const rotation = segment.direction === "east" || segment.direction === "west" ? Math.PI / 2 : 0;
      const position = {
        x: world.x + (segment.direction === "east" ? offset : segment.direction === "west" ? -offset : 0),
        z: world.z + (segment.direction === "south" ? offset : segment.direction === "north" ? -offset : 0)
      };

      this.dummy.position.set(position.x, WALL_HEIGHT / 2, position.z);
      this.dummy.rotation.set(0, rotation, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(instance, this.dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createLightMesh(map: GeneratedMap): THREE.InstancedMesh {
    const lightCount = countCells(map.lights);
    const geometry = new THREE.BoxGeometry(1.55, 0.045, 0.24);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.light, lightCount);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    let instance = 0;

    forEachOpenCell(map, (point, cellIndex) => {
      if (map.lights[cellIndex] !== 1) {
        return;
      }

      const world = cellToWorld(map, point);
      this.dummy.position.set(world.x, WALL_HEIGHT - 0.07, world.z);
      this.dummy.rotation.set(0, (point.x + point.y) % 2 === 0 ? 0 : Math.PI / 2, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(instance, this.dummy.matrix);
      instance += 1;
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createPillarMesh(map: GeneratedMap): THREE.InstancedMesh {
    const pillarCount = countCells(map.pillars);
    const geometry = new THREE.BoxGeometry(0.48, WALL_HEIGHT, 0.48);
    const mesh = new THREE.InstancedMesh(geometry, this.materials.pillar, pillarCount);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    let instance = 0;

    forEachOpenCell(map, (point, cellIndex) => {
      if (map.pillars[cellIndex] !== 1) {
        return;
      }

      const world = cellToWorld(map, point);
      this.dummy.position.set(world.x, WALL_HEIGHT / 2, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(instance, this.dummy.matrix);
      instance += 1;
    });

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  private createExitDoor(map: GeneratedMap): THREE.Mesh {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.08, 0.1), this.materials.door);
    const world = cellToWorld(map, map.exit);
    const offset = map.cellSize / 2 - 0.035;
    door.position.set(world.x, 1.04, world.z);

    if (map.exitFacing === "north") {
      door.position.z -= offset;
    } else if (map.exitFacing === "south") {
      door.position.z += offset;
    } else if (map.exitFacing === "east") {
      door.position.x += offset;
      door.rotation.y = Math.PI / 2;
    } else {
      door.position.x -= offset;
      door.rotation.y = Math.PI / 2;
    }

    return door;
  }

  private addLighting(): void {
    const hemisphere = new THREE.HemisphereLight("#f2df95", "#473618", 1.18);
    this.scene.add(hemisphere);

    const playerLight = new THREE.PointLight("#fff3b3", 1.8, 14, 1.6);
    playerLight.position.set(0, 0.1, 0.15);
    this.camera.add(playerLight);
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private clearWorld(): void {
    for (const child of [...this.worldGroup.children]) {
      this.worldGroup.remove(child);
      disposeObject(child);
    }
  }

  private bindContextLossGuard(): void {
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      document.body.classList.remove("is-pointer-locked");
    });
  }
}

function forEachOpenCell(map: GeneratedMap, callback: (point: GridPoint, index: number) => void): void {
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const cellIndex = y * map.width + x;
      if (map.open[cellIndex] === 1) {
        callback({ x, y }, cellIndex);
      }
    }
  }
}

function countCells(cells: Uint8Array): number {
  let count = 0;
  for (const cell of cells) {
    count += cell;
  }
  return count;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
  });
}
