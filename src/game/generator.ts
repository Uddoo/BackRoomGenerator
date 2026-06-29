import { SeededRandom, normalizeSeed } from "./random";
import type { Direction, GeneratedMap, GridPoint, WallSegment, WorldPoint } from "./types";

const CELL_SIZE = 4;
const MIN_SIZE = 21;
const MAX_SIZE = 65;

const DIRECTIONS: Array<{ direction: Direction; dx: number; dy: number }> = [
  { direction: "north", dx: 0, dy: -1 },
  { direction: "east", dx: 1, dy: 0 },
  { direction: "south", dx: 0, dy: 1 },
  { direction: "west", dx: -1, dy: 0 }
];

export function generateBackrooms(seedInput: string, requestedSize = 39): GeneratedMap {
  const seed = normalizeSeed(seedInput);
  const rng = new SeededRandom(`${seed}:${requestedSize}`);
  const width = normalizeSize(requestedSize);
  const height = width;
  const open = new Uint8Array(width * height);
  const lights = new Uint8Array(width * height);
  const pillars = new Uint8Array(width * height);

  const index = (x: number, y: number) => y * width + x;
  const inside = (x: number, y: number) => x > 0 && y > 0 && x < width - 1 && y < height - 1;
  const isOpen = (x: number, y: number) => inside(x, y) && open[index(x, y)] === 1;
  const carve = (x: number, y: number) => {
    if (inside(x, y)) {
      open[index(x, y)] = 1;
    }
  };

  carveMaze(width, height, carve, isOpen, rng);
  const roomCount = carveRooms(width, height, carve, rng);
  const loopCount = addLoops(width, height, open, index, isOpen, rng);

  const spawn = chooseSpawn(width, height, open, index, rng);
  const distances = floodDistances(width, height, open, index, spawn);
  const exit = chooseFarthestOpen(width, height, open, index, distances);
  const exitFacing = chooseExitFacing(exit, isOpen);

  let openCount = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (!isOpen(x, y)) {
        continue;
      }

      const cellIndex = index(x, y);
      openCount += 1;
      const neighbors = countOpenNeighbors(x, y, isOpen);
      const stripe = (x * 13 + y * 7 + Math.floor(rng.next() * 4)) % 5;

      if (neighbors >= 2 && stripe <= 1 && rng.chance(0.54)) {
        lights[cellIndex] = 1;
      }

      if (neighbors >= 4 && rng.chance(0.085) && distanceSquared({ x, y }, spawn) > 20) {
        pillars[cellIndex] = 1;
      }
    }
  }

  lights[index(spawn.x, spawn.y)] = 1;
  lights[index(exit.x, exit.y)] = 1;
  pillars[index(spawn.x, spawn.y)] = 0;
  pillars[index(exit.x, exit.y)] = 0;

  return {
    seed,
    width,
    height,
    cellSize: CELL_SIZE,
    open,
    lights,
    pillars,
    spawn,
    exit,
    exitFacing,
    wallSegments: buildWallSegments(width, height, isOpen),
    openCount,
    roomCount,
    loopCount
  };
}

export function cellToWorld(map: GeneratedMap, point: GridPoint): WorldPoint {
  return {
    x: (point.x - map.width / 2 + 0.5) * map.cellSize,
    z: (point.y - map.height / 2 + 0.5) * map.cellSize
  };
}

export function worldToCell(map: GeneratedMap, point: WorldPoint): GridPoint {
  return {
    x: Math.floor(point.x / map.cellSize + map.width / 2),
    y: Math.floor(point.z / map.cellSize + map.height / 2)
  };
}

export function isOpenCell(map: GeneratedMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height && map.open[y * map.width + x] === 1;
}

function normalizeSize(size: number): number {
  const bounded = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.floor(size)));
  return bounded % 2 === 0 ? bounded + 1 : bounded;
}

function carveMaze(
  width: number,
  height: number,
  carve: (x: number, y: number) => void,
  isOpen: (x: number, y: number) => boolean,
  rng: SeededRandom
): void {
  const start = {
    x: randomOdd(rng, 1, width - 2),
    y: randomOdd(rng, 1, height - 2)
  };
  const stack: GridPoint[] = [start];
  carve(start.x, start.y);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = rng.shuffle([...DIRECTIONS]).filter(({ dx, dy }) => {
      const nextX = current.x + dx * 2;
      const nextY = current.y + dy * 2;
      return nextX > 0 && nextY > 0 && nextX < width - 1 && nextY < height - 1 && !isOpen(nextX, nextY);
    });

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[0];
    carve(current.x + next.dx, current.y + next.dy);
    carve(current.x + next.dx * 2, current.y + next.dy * 2);
    stack.push({ x: current.x + next.dx * 2, y: current.y + next.dy * 2 });
  }
}

function carveRooms(
  width: number,
  height: number,
  carve: (x: number, y: number) => void,
  rng: SeededRandom
): number {
  const attempts = Math.floor((width * height) / 68);
  let carved = 0;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const roomWidth = rng.int(2, 5) + (rng.chance(0.28) ? rng.int(1, 3) : 0);
    const roomHeight = rng.int(2, 5) + (rng.chance(0.28) ? rng.int(1, 3) : 0);
    const x = rng.int(1, width - roomWidth - 2);
    const y = rng.int(1, height - roomHeight - 2);

    for (let yy = y; yy < y + roomHeight; yy += 1) {
      for (let xx = x; xx < x + roomWidth; xx += 1) {
        carve(xx, yy);
      }
    }

    carved += 1;
  }

  return carved;
}

function addLoops(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  isOpen: (x: number, y: number) => boolean,
  rng: SeededRandom
): number {
  let loopCount = 0;
  const loopChance = width > 49 ? 0.055 : 0.043;

  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      if (isOpen(x, y)) {
        continue;
      }

      const horizontal = isOpen(x - 1, y) && isOpen(x + 1, y);
      const vertical = isOpen(x, y - 1) && isOpen(x, y + 1);
      if ((horizontal || vertical) && rng.chance(loopChance)) {
        open[index(x, y)] = 1;
        loopCount += 1;
      }
    }
  }

  return loopCount;
}

function chooseSpawn(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  rng: SeededRandom
): GridPoint {
  const center = { x: width / 2, y: height / 2 };
  let best = { x: 1, y: 1 };
  let bestScore = Number.POSITIVE_INFINITY;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (open[index(x, y)] !== 1) {
        continue;
      }

      const score = distanceSquared({ x, y }, center) + rng.next() * 8;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }

  return best;
}

function floodDistances(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  spawn: GridPoint
): Int32Array {
  const distances = new Int32Array(width * height);
  distances.fill(-1);
  const queue: GridPoint[] = [spawn];
  distances[index(spawn.x, spawn.y)] = 0;
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor];
    cursor += 1;
    const distance = distances[index(current.x, current.y)];

    for (const { dx, dy } of DIRECTIONS) {
      const x = current.x + dx;
      const y = current.y + dy;
      const cellIndex = index(x, y);
      if (x < 0 || y < 0 || x >= width || y >= height || open[cellIndex] !== 1 || distances[cellIndex] !== -1) {
        continue;
      }

      distances[cellIndex] = distance + 1;
      queue.push({ x, y });
    }
  }

  return distances;
}

function chooseFarthestOpen(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  distances: Int32Array
): GridPoint {
  let best = { x: 1, y: 1 };
  let bestDistance = -1;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const cellIndex = index(x, y);
      if (open[cellIndex] !== 1 || distances[cellIndex] <= bestDistance) {
        continue;
      }

      bestDistance = distances[cellIndex];
      best = { x, y };
    }
  }

  return best;
}

function chooseExitFacing(exit: GridPoint, isOpen: (x: number, y: number) => boolean): Direction {
  const closedSides = DIRECTIONS.filter(({ dx, dy }) => !isOpen(exit.x + dx, exit.y + dy));
  return closedSides[0]?.direction ?? "north";
}

function buildWallSegments(width: number, height: number, isOpen: (x: number, y: number) => boolean): WallSegment[] {
  const segments: WallSegment[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isOpen(x, y)) {
        continue;
      }

      for (const { direction, dx, dy } of DIRECTIONS) {
        if (!isOpen(x + dx, y + dy)) {
          segments.push({ x, y, direction });
        }
      }
    }
  }

  return segments;
}

function countOpenNeighbors(x: number, y: number, isOpen: (x: number, y: number) => boolean): number {
  return DIRECTIONS.reduce((count, { dx, dy }) => count + (isOpen(x + dx, y + dy) ? 1 : 0), 0);
}

function randomOdd(rng: SeededRandom, min: number, max: number): number {
  let value = rng.int(min, max);
  if (value % 2 === 0) {
    value += value + 1 <= max ? 1 : -1;
  }
  return value;
}

function distanceSquared(a: GridPoint, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
