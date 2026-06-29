import * as THREE from "three";
import { cellToWorld } from "../game/generator";
import type { Direction, GeneratedMap, GridPoint } from "../game/types";
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
    this.renderer.toneMappingExposure = 1.26;
    this.renderer.domElement.tabIndex = 0;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 150);
    this.camera.position.set(0, PLAYER_HEIGHT, 0);
    this.scene.add(this.camera);

    this.materials = createBackroomsMaterials();
    this.scene.background = new THREE.Color("#6f622d");
    this.scene.fog = new THREE.FogExp2("#8a7c3f", 0.013);
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
    const exitDoors = this.createExitDoors(map);

    this.worldGroup.add(floorMesh, ceilingMesh, wallMesh, lightMesh, pillarMesh, exitDoors);

    const spawn = cellToWorld(map, map.spawn);
    this.camera.position.set(spawn.x, PLAYER_HEIGHT, spawn.z);
    this.camera.rotation.set(0, directionToYaw(map.spawnFacing), 0);

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

  private createLightMesh(map: GeneratedMap): THREE.Group {
    const lightCount = countCells(map.lights);
    const group = new THREE.Group();
    const tubeGeometry = new THREE.BoxGeometry(1.55, 0.03, 0.032);
    const tubeMesh = new THREE.InstancedMesh(tubeGeometry, this.materials.light, lightCount * 4);
    tubeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    let instance = 0;

    forEachOpenCell(map, (point, cellIndex) => {
      if (map.lights[cellIndex] !== 1) {
        return;
      }

      const world = cellToWorld(map, point);
      const horizontal = (point.x + point.y) % 2 === 0;
      const rotation = horizontal ? 0 : Math.PI / 2;
      for (let tube = 0; tube < 4; tube += 1) {
        const offset = (tube - 1.5) * 0.12;
        this.dummy.position.set(world.x + (horizontal ? 0 : offset), WALL_HEIGHT - 0.065, world.z + (horizontal ? offset : 0));
        this.dummy.rotation.set(0, rotation, 0);
        this.dummy.scale.setScalar(1);
        this.dummy.updateMatrix();
        tubeMesh.setMatrixAt(instance, this.dummy.matrix);
        instance += 1;
      }
    });

    tubeMesh.instanceMatrix.needsUpdate = true;
    group.add(tubeMesh);
    return group;
  }

  private createPillarMesh(map: GeneratedMap): THREE.InstancedMesh {
    const pillarCount = countCells(map.pillars);
    const geometry = new THREE.BoxGeometry(0.92, WALL_HEIGHT, 0.92);
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

  private createExitDoors(map: GeneratedMap): THREE.Group {
    const group = new THREE.Group();
    group.add(this.createDoorMesh(map, map.exit, map.exitFacing, this.materials.door));
    for (const falseExit of map.falseExits) {
      group.add(this.createDoorMesh(map, falseExit, falseExit.facing, this.materials.falseDoor));
    }
    return group;
  }

  private createDoorMesh(
    map: GeneratedMap,
    point: GridPoint,
    facing: GeneratedMap["exitFacing"],
    material: THREE.MeshStandardMaterial
  ): THREE.Mesh {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.08, 0.1), material);
    const world = cellToWorld(map, point);
    const offset = map.cellSize / 2 - 0.035;
    door.position.set(world.x, 1.04, world.z);

    if (facing === "north") {
      door.position.z -= offset;
    } else if (facing === "south") {
      door.position.z += offset;
    } else if (facing === "east") {
      door.position.x += offset;
      door.rotation.y = Math.PI / 2;
    } else {
      door.position.x -= offset;
      door.rotation.y = Math.PI / 2;
    }

    return door;
  }

  private addLighting(): void {
    const ambient = new THREE.AmbientLight("#f5e59f", 0.74);
    this.scene.add(ambient);

    const hemisphere = new THREE.HemisphereLight("#fff1ac", "#a09055", 1.56);
    this.scene.add(hemisphere);

    const playerLight = new THREE.PointLight("#fff2ad", 0.95, 17, 1.35);
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

function directionToYaw(direction: Direction): number {
  if (direction === "east") {
    return -Math.PI / 2;
  }
  if (direction === "south") {
    return Math.PI;
  }
  if (direction === "west") {
    return Math.PI / 2;
  }
  return 0;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
  });
}
