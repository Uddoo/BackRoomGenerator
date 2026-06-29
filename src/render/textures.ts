import * as THREE from "three";

type PaintFn = (context: CanvasRenderingContext2D, size: number) => void;

export interface BackroomsMaterials {
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  light: THREE.MeshBasicMaterial;
  pillar: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  falseDoor: THREE.MeshStandardMaterial;
}

export function createBackroomsMaterials(): BackroomsMaterials {
  const wallpaper = createTexture(paintWallpaper);
  wallpaper.repeat.set(0.72, 1.08);

  const carpet = createTexture(paintCarpet);
  carpet.repeat.set(1.7, 1.7);

  const ceiling = createTexture(paintCeiling);
  ceiling.repeat.set(0.72, 0.72);

  return {
    wall: new THREE.MeshStandardMaterial({
      map: wallpaper,
      roughness: 0.98,
      metalness: 0.02,
      color: "#c8bd7a"
    }),
    floor: new THREE.MeshStandardMaterial({
      map: carpet,
      roughness: 0.98,
      metalness: 0,
      color: "#d9cf9a"
    }),
    ceiling: new THREE.MeshStandardMaterial({
      map: ceiling,
      roughness: 0.96,
      metalness: 0,
      color: "#b09e63"
    }),
    light: new THREE.MeshBasicMaterial({
      color: "#fff8d6"
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
    }),
    falseDoor: new THREE.MeshStandardMaterial({
      color: "#3b2119",
      emissive: "#120403",
      roughness: 0.82,
      metalness: 0.08
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
  context.fillStyle = "#b5a765";
  context.fillRect(0, 0, size, size);

  const wash = context.createLinearGradient(0, 0, size, size);
  wash.addColorStop(0, "rgba(255, 240, 168, 0.16)");
  wash.addColorStop(0.52, "rgba(130, 111, 55, 0.05)");
  wash.addColorStop(1, "rgba(68, 55, 21, 0.12)");
  context.fillStyle = wash;
  context.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 60) {
    context.fillStyle = "rgba(255, 238, 150, 0.055)";
    context.fillRect(x + 8, 0, 20, size);
    context.fillStyle = "rgba(72, 61, 28, 0.055)";
    context.fillRect(x + 38, 0, 4, size);
  }

  context.strokeStyle = "rgba(70, 58, 23, 0.07)";
  context.lineWidth = 1.1;
  for (let x = 22; x < size + 60; x += 60) {
    paintWallpaperMotif(context, x, size);
  }

  for (let x = 0; x < size; x += 58) {
    const dripHeight = 28 + ((x * 31) % 96);
    context.fillStyle = "rgba(82, 68, 31, 0.055)";
    context.fillRect(x + 9, 0, 3, dripHeight);
  }

  paintNoise(context, size, 1800, 0.1, "#3e3417");
  paintNoise(context, size, 850, 0.08, "#fff0a2");
}

function paintCarpet(context: CanvasRenderingContext2D, size: number): void {
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#cabc83");
  gradient.addColorStop(0.52, "#ddd3a1");
  gradient.addColorStop(1, "#c0af78");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 10) {
    context.fillStyle = y % 30 === 0 ? "rgba(86, 70, 31, 0.08)" : "rgba(255, 244, 176, 0.07)";
    context.fillRect(0, y, size, 2);
  }

  for (let x = 0; x < size; x += 13) {
    context.fillStyle = "rgba(79, 63, 27, 0.035)";
    context.fillRect(x, 0, 1, size);
  }

  paintNoise(context, size, 2800, 0.11, "#5a471d");
  paintNoise(context, size, 1500, 0.1, "#fff2b2");
}

function paintCeiling(context: CanvasRenderingContext2D, size: number): void {
  context.fillStyle = "#a9975c";
  context.fillRect(0, 0, size, size);
  paintNoise(context, size, 900, 0.08, "#3b3114");

  context.strokeStyle = "rgba(71, 59, 24, 0.34)";
  context.lineWidth = 3;
  for (let x = 0; x <= size; x += size / 4) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, size);
    context.stroke();
  }

  for (let y = 0; y <= size; y += size / 4) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(240, 217, 116, 0.08)";
  context.lineWidth = 1;
  for (let x = size / 8; x < size; x += size / 4) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, size);
    context.stroke();
  }
}

function paintWallpaperMotif(context: CanvasRenderingContext2D, centerX: number, size: number): void {
  for (let y = -32; y < size + 64; y += 64) {
    context.beginPath();
    context.moveTo(centerX, y + 5);
    context.bezierCurveTo(centerX - 11, y + 18, centerX - 13, y + 38, centerX, y + 52);
    context.bezierCurveTo(centerX + 11, y + 38, centerX + 13, y + 18, centerX, y + 5);
    context.stroke();

    context.beginPath();
    context.moveTo(centerX - 12, y + 25);
    context.lineTo(centerX, y + 14);
    context.lineTo(centerX + 12, y + 25);
    context.stroke();
  }
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
