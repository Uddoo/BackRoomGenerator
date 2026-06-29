export type Direction = "north" | "east" | "south" | "west";

export interface GridPoint {
  x: number;
  y: number;
}

export interface WorldPoint {
  x: number;
  z: number;
}

export interface WallSegment {
  x: number;
  y: number;
  direction: Direction;
}

export interface GeneratedMap {
  seed: string;
  width: number;
  height: number;
  cellSize: number;
  open: Uint8Array;
  lights: Uint8Array;
  pillars: Uint8Array;
  spawn: GridPoint;
  exit: GridPoint;
  exitFacing: Direction;
  wallSegments: WallSegment[];
  openCount: number;
  roomCount: number;
  loopCount: number;
}
