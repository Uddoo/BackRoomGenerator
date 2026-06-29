import * as THREE from "three";

type PaintFn = (context: CanvasRenderingContext2D, size: number) => void;

export interface BackroomsMaterials {
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  light: THREE.MeshBasicMaterial;
  pillar: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
}

export function createBackroomsMaterials(): BackroomsMaterials {
  const wallpaper = createTexture(paintWallpaper);
  wallpaper.repeat.set(1, 1);

  const carpet = createTexture(paintCarpet);
  carpet.repeat.set(1.4, 1.4);

  const ceiling = createTexture(paintCeiling);
  ceiling.repeat.set(1, 1);

  return {
    wall: new THREE.MeshStandardMaterial({
      map: wallpaper,
      roughness: 0.94,
      metalness: 0.02,
      color: "#d7c46c"
    }),
    floor: new THREE.MeshStandardMaterial({
      map: carpet,
      roughness: 0.98,
      metalness: 0,
      color: "#b89a49"
    }),
    ceiling: new THREE.MeshStandardMaterial({
      map: ceiling,
      roughness: 0.9,
      metalness: 0,
      color: "#d6cf9a"
    }),
    light: new THREE.MeshBasicMaterial({
      color: "#fff7ba"
    }),
    pillar: new THREE.MeshStandardMaterial({
      map: wallpaper,
      roughness: 0.96,
      color: "#cdbb66"
    }),
    door: new THREE.MeshStandardMaterial({
      color: "#7d2016",
      emissive: "#260300",
      roughness: 0.72,
      metalness: 0.12
    })
  };
}

export function disposeMaterials(materials: BackroomsMaterials): void {
  for (const material of Object.values(materials)) {
    if ("map" in material && material.map) {
      material.map.dispose();
    }
    material.dispose();
  }
}

function createTexture(paint: PaintFn): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  paint(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function paintWallpaper(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = "#cdb65a";
  context.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 64) {
    context.fillStyle = "rgba(255, 232, 128, 0.18)";
    context.fillRect(x + 8, 0, 18, size);
    context.fillStyle = "rgba(74, 57, 21, 0.12)";
    context.fillRect(x + 40, 0, 4, size);
  }

  context.strokeStyle = "rgba(76, 56, 18, 0.12)";
  context.lineWidth = 2;
  for (let y = 28; y < size; y += 94) {
    context.beginPath();
    for (let x = 0; x <= size; x += 16) {
      const wave = Math.sin((x + y) * 0.035) * 5;
      if (x === 0) {
        context.moveTo(x, y + wave);
      } else {
        context.lineTo(x, y + wave);
      }
    }
    context.stroke();
  }

  paintNoise(context, size, 1350, 0.1, "#2b230d");
  paintNoise(context, size, 650, 0.08, "#fff1a4");
}

function paintCarpet(context: CanvasRenderingContext2D, size: number): void {
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#92783a");
  gradient.addColorStop(1, "#b69a4d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 18) {
    context.fillStyle = y % 36 === 0 ? "rgba(66, 48, 18, 0.16)" : "rgba(255, 230, 130, 0.08)";
    context.fillRect(0, y, size, 3);
  }

  paintNoise(context, size, 2200, 0.16, "#2e210b");
  paintNoise(context, size, 900, 0.12, "#f4d77a");
}

function paintCeiling(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = "#d2cb95";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(71, 65, 43, 0.34)";
  context.lineWidth = 4;

  for (let x = 0; x <= size; x += size / 2) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, size);
    context.stroke();
  }

  for (let y = 0; y <= size; y += size / 2) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }

  paintNoise(context, size, 1000, 0.08, "#332d18");
}

function paintNoise(
  context: CanvasRenderingContext2D,
  size: number,
  count: number,
  alpha: number,
  color: string
): void {
  let state = 0x9e3779b9;
  context.fillStyle = color;
  context.globalAlpha = alpha;
  for (let i = 0; i < count; i += 1) {
    state = Math.imul(state ^ (state >>> 15), state | 1) + i;
    const x = Math.abs(state % size);
    state = Math.imul(state ^ (state >>> 7), state | 61);
    const y = Math.abs(state % size);
    const radius = 1 + Math.abs((state >>> 8) % 3);
    context.fillRect(x, y, radius, radius);
  }
  context.globalAlpha = 1;
}
