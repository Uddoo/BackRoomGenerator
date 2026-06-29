import { isOpenCell, worldToCell } from "./generator";
import type { GeneratedMap, WorldPoint } from "./types";

const COLLISION_SAMPLES = [
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
  { x: 0.72, z: 0.72 },
  { x: -0.72, z: 0.72 },
  { x: 0.72, z: -0.72 },
  { x: -0.72, z: -0.72 }
];

export function canOccupy(map: GeneratedMap, point: WorldPoint, radius: number): boolean {
  for (const sample of COLLISION_SAMPLES) {
    const cell = worldToCell(map, {
      x: point.x + sample.x * radius,
      z: point.z + sample.z * radius
    });

    if (!isOpenCell(map, cell.x, cell.y)) {
      return false;
    }
  }

  return true;
}

export function resolveMovement(map: GeneratedMap, from: WorldPoint, dx: number, dz: number, radius: number): WorldPoint {
  let x = from.x;
  let z = from.z;

  const stepX = { x: x + dx, z };
  if (canOccupy(map, stepX, radius)) {
    x = stepX.x;
  }

  const stepZ = { x, z: z + dz };
  if (canOccupy(map, stepZ, radius)) {
    z = stepZ.z;
  }

  return { x, z };
}
