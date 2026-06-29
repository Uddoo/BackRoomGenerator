import assert from "node:assert/strict";
import test from "node:test";
import { generateBackrooms } from "../src/game/generator";
import type { GeneratedMap } from "../src/game/types";

test("BRS-A2 applies blackout maintenance constraints", () => {
  const map = generateBackrooms("BRS-A2", 39);

  assert.ok(map.experience, "generated map should expose an experience seed");
  assert.ok(map.validation, "generated map should expose validation results");
  assert.equal(map.experience.theme.themeId, "utility");
  assert.ok(map.experience.sensory.blackoutRatio >= 0.2);
  assert.ok(map.experience.entities.entityFamily.includes("smiler"));
  assert.ok(map.experience.resources.budget.water + map.experience.resources.budget.battery >= 8);
  assert.equal(map.validation.passable, true);
  assert.equal(map.validation.resourceFloorSatisfied, true);
  assert.ok(lightRatio(map) < 0.52);
});

test("BRS-A1 remains a high-repetition level with a reachable true exit and decoys", () => {
  const map = generateBackrooms("BRS-A1", 39);

  assert.ok(map.experience, "generated map should expose an experience seed");
  assert.ok(map.validation, "generated map should expose validation results");
  assert.ok(map.falseExits, "generated map should expose false exits");
  assert.equal(map.experience.theme.themeId, "office_yellow");
  assert.ok(map.experience.anomaly.repetitionFactor >= 0.8);
  assert.ok(map.falseExits.length >= 1);
  assert.equal(map.validation.passable, true);
  assert.equal(map.validation.reachableOpenRatio, 1);
  assert.ok(map.validation.exitDistance >= Math.floor(map.width * 0.85));
});

test("BRS-A1 keeps a dense classic fluorescent ceiling rhythm", () => {
  const map = generateBackrooms("BRS-A1", 39);

  assert.ok(lightRatio(map) >= 0.34);
  assert.ok(map.experience.sensory.blackoutRatio <= 0.08);
  assert.ok(map.experience.sensory.flickerRate <= 0.08);
});

test("BRS-A1 starts in a cell with a readable forward sightline", () => {
  const map = generateBackrooms("BRS-A1", 39);

  assert.ok(longestSightline(map, map.spawn) >= 5);
  assert.ok(sightlineInDirection(map, map.spawn, map.spawnFacing) >= 5);
  assert.ok(openCellsNear(map, map.spawn, 3) >= 30);
});

test("experience generation is deterministic for the same seed and size", () => {
  const first = generateBackrooms("mixed-maintenance-echo", 51);
  const second = generateBackrooms("mixed-maintenance-echo", 51);

  assert.deepEqual(snapshot(first), snapshot(second));
});

function lightRatio(map: GeneratedMap): number {
  let lightCount = 0;
  for (const light of map.lights) {
    lightCount += light;
  }
  return lightCount / map.openCount;
}

function longestSightline(map: GeneratedMap, point: { x: number; y: number }): number {
  return Math.max(
    sightline(map, point, 0, -1),
    sightline(map, point, 1, 0),
    sightline(map, point, 0, 1),
    sightline(map, point, -1, 0)
  );
}

function sightline(map: GeneratedMap, point: { x: number; y: number }, dx: number, dy: number): number {
  let length = 0;
  let x = point.x + dx;
  let y = point.y + dy;
  while (x >= 0 && y >= 0 && x < map.width && y < map.height && map.open[y * map.width + x] === 1) {
    length += 1;
    x += dx;
    y += dy;
  }
  return length;
}

function sightlineInDirection(map: GeneratedMap, point: { x: number; y: number }, direction: GeneratedMap["spawnFacing"]): number {
  if (direction === "east") {
    return sightline(map, point, 1, 0);
  }
  if (direction === "south") {
    return sightline(map, point, 0, 1);
  }
  if (direction === "west") {
    return sightline(map, point, -1, 0);
  }
  return sightline(map, point, 0, -1);
}

function openCellsNear(map: GeneratedMap, point: { x: number; y: number }, radius: number): number {
  let count = 0;
  for (let y = point.y - radius; y <= point.y + radius; y += 1) {
    for (let x = point.x - radius; x <= point.x + radius; x += 1) {
      if (x >= 0 && y >= 0 && x < map.width && y < map.height && map.open[y * map.width + x] === 1) {
        count += 1;
      }
    }
  }
  return count;
}

function snapshot(map: GeneratedMap): unknown {
  return {
    seed: map.seed,
    width: map.width,
    openCount: map.openCount,
    roomCount: map.roomCount,
    loopCount: map.loopCount,
    spawn: map.spawn,
    spawnFacing: map.spawnFacing,
    exit: map.exit,
    falseExits: map.falseExits,
    experience: map.experience,
    validation: map.validation,
    open: Array.from(map.open),
    lights: Array.from(map.lights),
    pillars: Array.from(map.pillars)
  };
}
