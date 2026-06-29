import { SeededRandom, normalizeSeed } from "./random";
import type {
  BackroomsExperienceSeed,
  Direction,
  ExitDecoy,
  GeneratedMap,
  GridPoint,
  MapValidationReport,
  Purpose,
  ResourceBudget,
  ThemeId,
  WallSegment,
  WorldPoint
} from "./types";

const CELL_SIZE = 4;
const MIN_SIZE = 21;
const MAX_SIZE = 65;

const DIRECTIONS: Array<{ direction: Direction; dx: number; dy: number }> = [
  { direction: "north", dx: 0, dy: -1 },
  { direction: "east", dx: 1, dy: 0 },
  { direction: "south", dx: 0, dy: 1 },
  { direction: "west", dx: -1, dy: 0 }
];

type DangerClass = BackroomsExperienceSeed["danger"]["dangerClass"];
type EraProfile = BackroomsExperienceSeed["theme"]["eraProfile"];
type EventWeights = BackroomsExperienceSeed["events"]["eventWeights"];
type MissionTemplate = BackroomsExperienceSeed["mission"]["missionTemplate"];
type MoodCurve = BackroomsExperienceSeed["pacing"]["moodCurve"];
type StreamName = keyof BackroomsExperienceSeed["rng"]["streams"];

interface ExperiencePreset {
  purpose?: Purpose;
  themeId: ThemeId;
  themeMix?: Partial<Record<ThemeId, number>>;
  eraProfile?: EraProfile;
  wearLevel?: number;
  repetitionFactor?: number;
  motifPeriod?: number;
  misalignmentFactor?: number;
  anomalyModes?: string[];
  loopRatio?: number;
  branchFactor?: number;
  deadEndRatio?: number;
  oneWayRatio?: number;
  exitReliability?: number;
  falseExitRatio?: number;
  connectivityMode?: BackroomsExperienceSeed["topology"]["connectivityMode"];
  blackoutRatio?: number;
  flickerRate?: number;
  humLevel?: number;
  audioTemplate?: string;
  reverbProfile?: string;
  dangerClass?: DangerClass;
  resourceBudget?: Partial<ResourceBudget>;
  resourceRarity?: number;
  fakeResourceRatio?: number;
  entityFamily?: string[];
  spawnBudget?: number;
  darkPreference?: number;
  noiseResponse?: number;
  eventWeights?: Partial<EventWeights>;
  missionTemplate?: MissionTemplate;
  locks?: number;
  keys?: number;
  moodCurve?: MoodCurve;
  peakCount?: number;
  recoveryFloor?: number;
  resourcePressure?: number;
}

const PRESETS: Record<string, ExperiencePreset> = {
  "BRS-A1": {
    themeId: "office_yellow",
    repetitionFactor: 0.86,
    misalignmentFactor: 0.44,
    loopRatio: 0.18,
    exitReliability: 0.42,
    falseExitRatio: 0.22,
    blackoutRatio: 0.04,
    flickerRate: 0.04,
    humLevel: 0.73,
    dangerClass: 0,
    entityFamily: [],
    eventWeights: { ambient: 0.38, structural: 0.2, deception: 0.18, entity: 0.04, chase: 0.02 },
    moodCurve: "slow_burn_3_peaks",
    peakCount: 3,
    resourcePressure: 0.32
  },
  "BRS-A2": {
    themeId: "utility",
    eraProfile: "service_basement",
    repetitionFactor: 0.69,
    misalignmentFactor: 0.5,
    loopRatio: 0.16,
    exitReliability: 0.36,
    falseExitRatio: 0.12,
    blackoutRatio: 0.23,
    flickerRate: 0.18,
    humLevel: 0.81,
    audioTemplate: "mechanical_hum",
    reverbProfile: "metal_corridor",
    dangerClass: 3,
    resourceBudget: { water: 4, battery: 4, tool: 2, keyItem: 1, lure: 2 },
    entityFamily: ["smiler"],
    spawnBudget: 1,
    darkPreference: 0.86,
    eventWeights: { ambient: 0.24, structural: 0.18, deception: 0.16, entity: 0.26, chase: 0.08 },
    moodCurve: "blackout_pressure",
    peakCount: 3,
    resourcePressure: 0.62
  },
  "BRS-A3": {
    themeId: "electrical",
    eraProfile: "service_basement",
    repetitionFactor: 0.58,
    misalignmentFactor: 0.47,
    loopRatio: 0.2,
    exitReliability: 0.38,
    blackoutRatio: 0.16,
    flickerRate: 0.24,
    humLevel: 0.88,
    dangerClass: 4,
    resourceBudget: { water: 5, battery: 6, tool: 5, keyItem: 2, lure: 4 },
    entityFamily: ["smiler", "hound"],
    spawnBudget: 6,
    eventWeights: { ambient: 0.18, structural: 0.18, resource: 0.2, entity: 0.27, chase: 0.11 },
    missionTemplate: "find_exit_via_power_restore",
    locks: 2,
    keys: 2,
    moodCurve: "panic_spikes",
    peakCount: 4
  },
  "BRS-A4": {
    themeId: "office_empty",
    repetitionFactor: 0.76,
    misalignmentFactor: 0.35,
    loopRatio: 0.14,
    exitReliability: 0.58,
    falseExitRatio: 0.18,
    dangerClass: 1,
    resourceBudget: { water: 6, battery: 5, tool: 3, keyItem: 1, lure: 2 },
    entityFamily: [],
    eventWeights: { ambient: 0.36, resource: 0.2, deception: 0.22, entity: 0.04, chase: 0.02 },
    moodCurve: "false_safety",
    recoveryFloor: 0.34
  },
  "BRS-A5": {
    themeId: "hotel",
    eraProfile: "liminal_hotel",
    repetitionFactor: 0.72,
    misalignmentFactor: 0.52,
    loopRatio: 0.17,
    exitReliability: 0.28,
    falseExitRatio: 0.26,
    blackoutRatio: 0.12,
    humLevel: 0.42,
    audioTemplate: "quiet_jazz_bleed",
    reverbProfile: "soft_long_hall",
    dangerClass: 2,
    entityFamily: ["mimic"],
    eventWeights: { ambient: 0.2, structural: 0.14, deception: 0.31, entity: 0.18, chase: 0.05 },
    moodCurve: "false_safety",
    peakCount: 3
  },
  "BRS-A6": {
    themeId: "poolrooms",
    eraProfile: "sterile_pool",
    repetitionFactor: 0.81,
    misalignmentFactor: 0.61,
    loopRatio: 0.24,
    exitReliability: 0.48,
    falseExitRatio: 0.1,
    blackoutRatio: 0.03,
    flickerRate: 0.05,
    humLevel: 0.25,
    audioTemplate: "water_room_tone",
    reverbProfile: "wet_tile_echo",
    dangerClass: 0,
    entityFamily: [],
    eventWeights: { ambient: 0.36, structural: 0.25, deception: 0.18, entity: 0.02, chase: 0.01 },
    moodCurve: "melancholic_drift",
    peakCount: 2,
    recoveryFloor: 0.42
  },
  "BRS-A7": {
    themeId: "mixed",
    themeMix: { office_yellow: 0.5, utility: 0.5 },
    repetitionFactor: 0.68,
    misalignmentFactor: 0.46,
    loopRatio: 0.18,
    exitReliability: 0.48,
    falseExitRatio: 0.2,
    blackoutRatio: 0.12,
    humLevel: 0.66,
    dangerClass: 2,
    resourceBudget: { water: 5, battery: 5, tool: 4, keyItem: 2, lure: 2 },
    entityFamily: ["stalker"],
    missionTemplate: "find_exit_via_power_restore",
    locks: 2,
    keys: 2,
    eventWeights: { ambient: 0.23, structural: 0.22, resource: 0.14, deception: 0.18, entity: 0.15, chase: 0.08 },
    moodCurve: "slow_burn_3_peaks"
  },
  "BRS-A8": {
    themeId: "office_yellow",
    repetitionFactor: 0.74,
    misalignmentFactor: 0.58,
    loopRatio: 0.22,
    oneWayRatio: 0.12,
    exitReliability: 0.31,
    falseExitRatio: 0.41,
    blackoutRatio: 0.15,
    dangerClass: 3,
    resourceBudget: { water: 4, battery: 5, tool: 2, keyItem: 1, lure: 5 },
    entityFamily: ["hound"],
    spawnBudget: 1,
    eventWeights: { ambient: 0.17, structural: 0.19, deception: 0.22, entity: 0.16, chase: 0.2 },
    missionTemplate: "survive_false_exit_chase",
    moodCurve: "panic_spikes",
    peakCount: 4,
    resourcePressure: 0.7
  }
};

export function generateBackrooms(seedInput: string, requestedSize = 39): GeneratedMap {
  const seed = normalizeSeed(seedInput);
  const width = normalizeSize(requestedSize);
  const height = width;
  const experience = buildExperienceSeed(seed, width);
  const rng = new RngStreamRegistry(seed, width);
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

  carveMaze(width, height, carve, isOpen, rng.stream("layout"), experience);
  const roomCount = carveRooms(width, height, carve, rng.stream("rooms"), experience);
  const classicShowroomCount = carveClassicShowroom(width, height, carve, experience);
  const loopCount = addLoops(width, height, open, index, isOpen, rng.stream("layout"), experience);

  const spawn = chooseSpawn(width, height, open, index, rng.stream("layout"));
  const spawnFacing = chooseSpawnFacing(width, height, open, index, spawn);
  const distances = floodDistances(width, height, open, index, spawn);
  const exit = chooseFarthestOpen(width, height, open, index, distances);
  const exitFacing = chooseExitFacing(exit, isOpen);
  const falseExits = chooseFalseExits(width, height, open, index, distances, spawn, exit, isOpen, rng.stream("events"), experience);

  let openCount = 0;
  const sensoryRng = rng.stream("sensory");
  const lightChance = clamp(0.74 - experience.sensory.blackoutRatio * 1.35 - experience.sensory.flickerRate * 0.26, 0.1, 0.78);
  const landmarkChance = clamp(0.035 + experience.anomaly.misalignmentFactor * 0.095 + experience.danger.dangerClass * 0.008, 0.03, 0.16);

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (!isOpen(x, y)) {
        continue;
      }

      const cellIndex = index(x, y);
      openCount += 1;
      const neighbors = countOpenNeighbors(x, y, isOpen);
      const stripePeriod = experience.theme.themeId === "office_yellow" ? 5 : experience.anomaly.repetitionFactor > 0.8 ? 5 : 4;
      const stripe = (x * 13 + y * 7 + Math.floor(sensoryRng.next() * 4)) % stripePeriod;
      const stripeLimit = experience.theme.themeId === "office_yellow" ? 2 : 1;

      if (neighbors >= 2 && stripe <= stripeLimit && sensoryRng.chance(lightChance)) {
        lights[cellIndex] = 1;
      }

      if (neighbors >= 4 && sensoryRng.chance(landmarkChance) && distanceSquared({ x, y }, spawn) > 20) {
        pillars[cellIndex] = 1;
      }
    }
  }

  lights[index(spawn.x, spawn.y)] = 1;
  lights[index(exit.x, exit.y)] = 1;
  pillars[index(spawn.x, spawn.y)] = 0;
  pillars[index(exit.x, exit.y)] = 0;
  for (const decoy of falseExits) {
    lights[index(decoy.x, decoy.y)] = 1;
    pillars[index(decoy.x, decoy.y)] = 0;
  }

  const validation = validateGeneratedMap(width, height, open, index, exit, distances, openCount, loopCount, experience);

  return {
    seed,
    width,
    height,
    cellSize: CELL_SIZE,
    open,
    lights,
    pillars,
    spawn,
    spawnFacing,
    exit,
    exitFacing,
    falseExits,
    wallSegments: buildWallSegments(width, height, isOpen),
    openCount,
    roomCount: roomCount + classicShowroomCount,
    loopCount,
    experience,
    validation
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

function buildExperienceSeed(seed: string, width: number): BackroomsExperienceSeed {
  const rng = new SeededRandom(`${seed}:${width}:experience`);
  const preset = PRESETS[seed.toUpperCase()] ?? inferPreset(seed, rng);
  const themeId = preset.themeId;
  const dangerClass = preset.dangerClass ?? inferDangerClass(themeId, rng);
  const repetitionFactor = round2(clamp(preset.repetitionFactor ?? inferRepetitionFactor(themeId, rng), 0.42, 0.94));
  const misalignmentFactor = round2(clamp(preset.misalignmentFactor ?? inferMisalignmentFactor(themeId, rng), 0.08, 0.72));
  const loopRatio = round2(clamp(preset.loopRatio ?? 0.1 + misalignmentFactor * 0.18 + rng.next() * 0.08, 0.02, 0.35));
  const falseExitRatio = round2(clamp(preset.falseExitRatio ?? 0.08 + misalignmentFactor * 0.25 + rng.next() * 0.14, 0, 0.55));
  const expectedRunMinutes = Math.max(8, Math.round((width * width) / 86 + dangerClass * 2 + misalignmentFactor * 5));
  const resourceBudget = enforceResourceFloor(
    {
      water: preset.resourceBudget?.water ?? Math.max(1, Math.round(expectedRunMinutes / 7 + (themeId === "office_empty" ? 2 : 0))),
      battery: preset.resourceBudget?.battery ?? Math.max(1, Math.round(expectedRunMinutes / 8 + dangerClass)),
      tool: preset.resourceBudget?.tool ?? Math.max(1, Math.round(1 + dangerClass * 0.75)),
      keyItem: preset.resourceBudget?.keyItem ?? (preset.missionTemplate === "find_exit_via_power_restore" ? 2 : 1),
      lure: preset.resourceBudget?.lure ?? Math.max(1, Math.round(falseExitRatio * 7))
    },
    dangerClass,
    expectedRunMinutes
  );

  return {
    version: 1,
    purpose: preset.purpose ?? "generic",
    theme: {
      themeId,
      themeMix: normalizeThemeMix(preset.themeMix ?? defaultThemeMix(themeId)),
      eraProfile: preset.eraProfile ?? defaultEraProfile(themeId),
      paletteSeed: rng.int(100_000, 999_999),
      wearLevel: round2(clamp(preset.wearLevel ?? 0.28 + dangerClass * 0.08 + rng.next() * 0.24, 0.08, 0.92))
    },
    scale: {
      roomBudget: Math.max(12, Math.round((width * width) / 34 * (1.08 - repetitionFactor * 0.28))),
      edgeBudget: Math.max(width - 2, Math.round((width * width) / 34 * (1 + loopRatio))),
      sublevelCount: width > 55 ? 2 : 1,
      expectedRunMinutes
    },
    topology: {
      branchFactor: round2(clamp(preset.branchFactor ?? 0.18 + (1 - repetitionFactor) * 0.35 + rng.next() * 0.18, 0.1, 0.8)),
      loopRatio,
      deadEndRatio: round2(clamp(preset.deadEndRatio ?? 0.18 + repetitionFactor * 0.21 - loopRatio * 0.24, 0.08, 0.45)),
      oneWayRatio: round2(clamp(preset.oneWayRatio ?? (dangerClass >= 3 ? rng.next() * 0.08 : rng.next() * 0.03), 0, 0.16)),
      exitCount: 1,
      exitReliability: round2(clamp(preset.exitReliability ?? 0.62 - misalignmentFactor * 0.36 - falseExitRatio * 0.18, 0.25, 0.82)),
      falseExitRatio,
      connectivityMode: preset.connectivityMode ?? (misalignmentFactor > 0.46 ? "non_euclidean" : "maze")
    },
    anomaly: {
      repetitionFactor,
      misalignmentFactor,
      anomalyModes: preset.anomalyModes ?? inferAnomalyModes(themeId, misalignmentFactor),
      noiseSeed: rng.int(100_000, 99_999_999)
    },
    sensory: {
      cct: defaultCct(themeId, rng),
      lightVariance: round2(clamp(0.08 + misalignmentFactor * 0.14 + rng.next() * 0.06, 0.04, 0.28)),
      blackoutRatio: round2(clamp(preset.blackoutRatio ?? inferBlackoutRatio(themeId, dangerClass, rng), 0, 0.25)),
      flickerRate: round2(clamp(preset.flickerRate ?? 0.03 + dangerClass * 0.035 + rng.next() * 0.08, 0, 0.35)),
      audioTemplate: preset.audioTemplate ?? defaultAudioTemplate(themeId),
      humLevel: round2(clamp(preset.humLevel ?? defaultHumLevel(themeId, rng), 0, 1)),
      reverbProfile: preset.reverbProfile ?? defaultReverbProfile(themeId)
    },
    danger: {
      dangerClass,
      hazardMix: normalizeHazardMix(themeId, dangerClass)
    },
    resources: {
      budget: resourceBudget,
      rarity: round2(clamp(preset.resourceRarity ?? 0.34 + dangerClass * 0.08 + rng.next() * 0.18, 0.15, 0.86)),
      fakeResourceRatio: round2(clamp(preset.fakeResourceRatio ?? falseExitRatio * 0.45 + dangerClass * 0.025, 0, 0.34))
    },
    entities: {
      entityFamily: preset.entityFamily ?? defaultEntityFamily(themeId, dangerClass),
      spawnBudget: preset.spawnBudget ?? (dangerClass === 0 ? 0 : Math.max(1, dangerClass + Math.round(rng.next() * 2))),
      territoryRules: {
        darkPreference: round2(clamp(preset.darkPreference ?? 0.44 + dangerClass * 0.08 + (themeId === "utility" ? 0.14 : 0), 0.12, 0.92)),
        noiseResponse: round2(clamp(preset.noiseResponse ?? 0.28 + dangerClass * 0.08 + rng.next() * 0.18, 0.08, 0.88))
      }
    },
    events: {
      eventWeights: normalizeEventWeights(preset.eventWeights, dangerClass),
      eventCooldowns: {
        minor: Math.max(12, Math.round(34 - dangerClass * 3 - misalignmentFactor * 8)),
        major: Math.max(70, Math.round(132 - dangerClass * 10 - falseExitRatio * 28))
      },
      statePersistence: true
    },
    mission: {
      missionTemplate: preset.missionTemplate ?? (dangerClass >= 3 ? "wander_to_exit" : "wander_to_exit"),
      lockKeyProfile: {
        locks: preset.locks ?? 0,
        keys: preset.keys ?? 0,
        softlocksAllowed: 0
      }
    },
    pacing: {
      moodCurve: preset.moodCurve ?? (dangerClass >= 3 ? "panic_spikes" : "slow_burn_3_peaks"),
      peakCount: preset.peakCount ?? clampInt(2 + Math.round(dangerClass * 0.55 + rng.next()), 2, 5),
      recoveryFloor: round2(clamp(preset.recoveryFloor ?? 0.18 + (dangerClass <= 1 ? 0.08 : 0) + rng.next() * 0.08, 0.12, 0.48)),
      resourcePressure: round2(clamp(preset.resourcePressure ?? 0.28 + dangerClass * 0.1 + falseExitRatio * 0.24, 0.18, 0.82))
    },
    rng: {
      master: `${seed}:${width}`,
      streams: {
        experience: rng.int(10_000, 999_999),
        layout: rng.int(10_000, 999_999),
        rooms: rng.int(10_000, 999_999),
        sensory: rng.int(10_000, 999_999),
        resources: rng.int(10_000, 999_999),
        entities: rng.int(10_000, 999_999),
        events: rng.int(10_000, 999_999)
      }
    }
  };
}

function inferPreset(seed: string, rng: SeededRandom): ExperiencePreset {
  const lower = seed.toLowerCase();
  if (lower.includes("pool")) {
    return { themeId: "poolrooms", dangerClass: 0 };
  }
  if (lower.includes("hotel") || lower.includes("echo")) {
    return { themeId: "hotel", dangerClass: 2 };
  }
  if (lower.includes("electric") || lower.includes("power")) {
    return { themeId: "electrical", dangerClass: 3 };
  }
  if (lower.includes("utility") || lower.includes("maintenance")) {
    return { themeId: "utility", dangerClass: 2 };
  }
  if (lower.includes("office") || lower.includes("level-0")) {
    return { themeId: "office_yellow", dangerClass: 0 };
  }
  const themeId = rng.pick<ThemeId>(["office_yellow", "utility", "office_empty", "hotel", "poolrooms", "mixed"]);
  return { themeId };
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
  rng: SeededRandom,
  experience: BackroomsExperienceSeed
): void {
  const start = {
    x: randomOdd(rng, 1, width - 2),
    y: randomOdd(rng, 1, height - 2)
  };
  const stack: GridPoint[] = [start];
  carve(start.x, start.y);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = orderDirections(current, rng, experience).filter(({ dx, dy }) => {
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
  rng: SeededRandom,
  experience: BackroomsExperienceSeed
): number {
  const baseAttempts = Math.floor((width * height) / 68);
  const themeMultiplier = experience.theme.themeId === "poolrooms" ? 1.3 : experience.theme.themeId === "utility" ? 0.78 : 1;
  const repetitionMultiplier = clamp(1.18 - experience.anomaly.repetitionFactor * 0.38, 0.68, 1.05);
  const attempts = Math.max(3, Math.round(baseAttempts * themeMultiplier * repetitionMultiplier));
  let carved = 0;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const broad = experience.theme.themeId === "poolrooms" || experience.theme.themeId === "office_empty";
    const roomWidth = rng.int(2, broad ? 6 : 5) + (rng.chance((1 - experience.anomaly.repetitionFactor) * 0.45 + 0.16) ? rng.int(1, broad ? 4 : 3) : 0);
    const roomHeight = rng.int(2, broad ? 6 : 5) + (rng.chance((1 - experience.anomaly.repetitionFactor) * 0.45 + 0.16) ? rng.int(1, broad ? 4 : 3) : 0);
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

function carveClassicShowroom(
  width: number,
  height: number,
  carve: (x: number, y: number) => void,
  experience: BackroomsExperienceSeed
): number {
  if (experience.theme.themeId !== "office_yellow") {
    return 0;
  }

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const radiusX = Math.min(4, Math.floor((width - 5) / 2));
  const radiusY = Math.min(3, Math.floor((height - 5) / 2));

  for (let y = centerY - radiusY; y <= centerY + radiusY; y += 1) {
    for (let x = centerX - radiusX; x <= centerX + radiusX; x += 1) {
      carve(x, y);
    }
  }

  for (let y = centerY - 2; y <= centerY + 2; y += 1) {
    carve(centerX + radiusX + 1, y);
    carve(centerX - radiusX - 1, y);
  }

  for (let x = centerX - 3; x <= centerX + 3; x += 1) {
    carve(x, centerY + radiusY + 1);
  }

  return 1;
}

function addLoops(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  isOpen: (x: number, y: number) => boolean,
  rng: SeededRandom,
  experience: BackroomsExperienceSeed
): number {
  let loopCount = 0;
  const loopChance = clamp(0.015 + experience.topology.loopRatio * 0.18 + experience.anomaly.misalignmentFactor * 0.026, 0.02, 0.12);

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

function chooseSpawnFacing(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  spawn: GridPoint
): Direction {
  let bestDirection: Direction = "north";
  let bestScore = -1;

  for (const { direction, dx, dy } of DIRECTIONS) {
    let x = spawn.x + dx;
    let y = spawn.y + dy;
    let score = 0;

    while (x >= 0 && y >= 0 && x < width && y < height && open[index(x, y)] === 1) {
      score += 1;
      score += countSideOpenings(width, height, open, index, x, y, dx, dy) * 0.4;
      x += dx;
      y += dy;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
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

function chooseFalseExits(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  distances: Int32Array,
  spawn: GridPoint,
  exit: GridPoint,
  isOpen: (x: number, y: number) => boolean,
  rng: SeededRandom,
  experience: BackroomsExperienceSeed
): ExitDecoy[] {
  const desiredCount = Math.min(4, Math.max(0, Math.round(experience.topology.falseExitRatio * 5)));
  if (desiredCount === 0) {
    return [];
  }

  const exitDistance = distances[index(exit.x, exit.y)];
  const candidates: Array<ExitDecoy & { score: number }> = [];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const cellIndex = index(x, y);
      const distance = distances[cellIndex];
      if (open[cellIndex] !== 1 || distance < Math.max(6, exitDistance * 0.34) || samePoint({ x, y }, spawn) || samePoint({ x, y }, exit)) {
        continue;
      }

      const facing = chooseExitFacing({ x, y }, isOpen);
      const score = distance - Math.sqrt(distanceSquared({ x, y }, exit)) * 0.8 + rng.next() * 10;
      candidates.push({
        x,
        y,
        facing,
        reliability: round2(clamp(experience.topology.exitReliability * 0.45 + rng.next() * 0.18, 0.08, 0.48)),
        score
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const picked: ExitDecoy[] = [];
  for (const candidate of candidates) {
    if (picked.some((existing) => distanceSquared(existing, candidate) < 28)) {
      continue;
    }
    picked.push({
      x: candidate.x,
      y: candidate.y,
      facing: candidate.facing,
      reliability: candidate.reliability
    });
    if (picked.length >= desiredCount) {
      break;
    }
  }

  return picked;
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

function validateGeneratedMap(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  exit: GridPoint,
  distances: Int32Array,
  openCount: number,
  loopCount: number,
  experience: BackroomsExperienceSeed
): MapValidationReport {
  let reachable = 0;
  let deadEndCount = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const cellIndex = index(x, y);
      if (open[cellIndex] !== 1) {
        continue;
      }
      if (distances[cellIndex] >= 0) {
        reachable += 1;
      }
      if (countOpenNeighborsFromGrid(x, y, width, height, open, index) <= 1) {
        deadEndCount += 1;
      }
    }
  }

  const exitDistance = distances[index(exit.x, exit.y)];
  const reachableOpenRatio = openCount === 0 ? 0 : round3(reachable / openCount);
  const resourceFloorSatisfied = experience.resources.budget.water + experience.resources.budget.battery >= minimumSurvivalBudget(experience.danger.dangerClass, experience.scale.expectedRunMinutes);
  const warnings: string[] = [];

  if (exitDistance < Math.floor(width * 0.75)) {
    warnings.push("critical_path_short");
  }
  if (experience.topology.falseExitRatio > 0.25 && experience.topology.exitReliability < 0.32) {
    warnings.push("high_deception_low_exit_reliability");
  }
  if (experience.sensory.blackoutRatio > 0.18 && experience.entities.entityFamily.length === 0) {
    warnings.push("blackout_without_entity_payoff");
  }

  return {
    passable: exitDistance >= 0 && reachableOpenRatio === 1,
    reachableOpenRatio,
    exitDistance,
    deadEndCount,
    actualLoopRatio: round3(loopCount / Math.max(1, openCount)),
    resourceFloorSatisfied,
    softlockFree: true,
    warnings
  };
}

function orderDirections(
  current: GridPoint,
  rng: SeededRandom,
  experience: BackroomsExperienceSeed
): Array<{ direction: Direction; dx: number; dy: number }> {
  const directions = rng.shuffle([...DIRECTIONS]);
  const favorsCorridors = experience.anomaly.repetitionFactor > 0.78 || experience.theme.themeId === "utility";
  if (!favorsCorridors) {
    return directions;
  }
  const horizontalBias = (current.x + experience.anomaly.noiseSeed) % 3 !== 0;
  return directions.sort((a, b) => {
    const aStraight = horizontalBias ? Math.abs(a.dx) : Math.abs(a.dy);
    const bStraight = horizontalBias ? Math.abs(b.dx) : Math.abs(b.dy);
    return bStraight - aStraight;
  });
}

function countOpenNeighbors(x: number, y: number, isOpen: (x: number, y: number) => boolean): number {
  return DIRECTIONS.reduce((count, { dx, dy }) => count + (isOpen(x + dx, y + dy) ? 1 : 0), 0);
}

function countOpenNeighborsFromGrid(
  x: number,
  y: number,
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number
): number {
  return DIRECTIONS.reduce((count, { dx, dy }) => {
    const nextX = x + dx;
    const nextY = y + dy;
    return count + (nextX >= 0 && nextY >= 0 && nextX < width && nextY < height && open[index(nextX, nextY)] === 1 ? 1 : 0);
  }, 0);
}

function countSideOpenings(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  x: number,
  y: number,
  dx: number,
  dy: number
): number {
  const leftX = x + dy;
  const leftY = y - dx;
  const rightX = x - dy;
  const rightY = y + dx;
  return Number(isGridOpen(width, height, open, index, leftX, leftY)) + Number(isGridOpen(width, height, open, index, rightX, rightY));
}

function isGridOpen(
  width: number,
  height: number,
  open: Uint8Array,
  index: (x: number, y: number) => number,
  x: number,
  y: number
): boolean {
  return x >= 0 && y >= 0 && x < width && y < height && open[index(x, y)] === 1;
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

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function defaultThemeMix(themeId: ThemeId): Partial<Record<ThemeId, number>> {
  if (themeId === "mixed") {
    return { office_yellow: 0.5, utility: 0.5 };
  }
  return { [themeId]: 1 };
}

function normalizeThemeMix(themeMix: Partial<Record<ThemeId, number>>): Partial<Record<ThemeId, number>> {
  const total = Object.values(themeMix).reduce((sum, value) => sum + (value ?? 0), 0) || 1;
  const normalized: Partial<Record<ThemeId, number>> = {};
  for (const [theme, value] of Object.entries(themeMix) as Array<[ThemeId, number]>) {
    normalized[theme] = round2(value / total);
  }
  return normalized;
}

function defaultEraProfile(themeId: ThemeId): EraProfile {
  if (themeId === "utility" || themeId === "electrical") {
    return "service_basement";
  }
  if (themeId === "hotel") {
    return "liminal_hotel";
  }
  if (themeId === "poolrooms") {
    return "sterile_pool";
  }
  return "late_20th_century";
}

function inferDangerClass(themeId: ThemeId, rng: SeededRandom): DangerClass {
  const base = themeId === "electrical" ? 3 : themeId === "utility" ? 2 : themeId === "hotel" ? 2 : themeId === "poolrooms" ? 0 : 1;
  return clampInt(base + (rng.chance(0.24) ? 1 : 0), 0, 5) as DangerClass;
}

function inferRepetitionFactor(themeId: ThemeId, rng: SeededRandom): number {
  const base = themeId === "office_yellow" ? 0.78 : themeId === "poolrooms" ? 0.82 : themeId === "utility" ? 0.66 : 0.62;
  return base + rng.next() * 0.16;
}

function inferMisalignmentFactor(themeId: ThemeId, rng: SeededRandom): number {
  const base = themeId === "poolrooms" ? 0.5 : themeId === "hotel" ? 0.46 : themeId === "office_yellow" ? 0.38 : 0.34;
  return base + rng.next() * 0.18;
}

function inferAnomalyModes(themeId: ThemeId, misalignmentFactor: number): string[] {
  const modes = ["offset_return"];
  if (themeId === "office_yellow" || misalignmentFactor > 0.42) {
    modes.push("peripheral_shift");
  }
  if (misalignmentFactor > 0.5) {
    modes.push("door_remap");
  }
  if (themeId === "poolrooms") {
    modes.push("senseless_connectivity");
  }
  return modes;
}

function inferBlackoutRatio(themeId: ThemeId, dangerClass: DangerClass, rng: SeededRandom): number {
  const base = themeId === "utility" || themeId === "electrical" ? 0.1 : themeId === "hotel" ? 0.08 : themeId === "poolrooms" ? 0.02 : 0.06;
  return base + dangerClass * 0.025 + rng.next() * 0.07;
}

function defaultCct(themeId: ThemeId, rng: SeededRandom): number {
  const base = themeId === "poolrooms" ? 5200 : themeId === "utility" || themeId === "electrical" ? 3900 : 4300;
  return Math.round(base + (rng.next() - 0.5) * 420);
}

function defaultAudioTemplate(themeId: ThemeId): string {
  if (themeId === "utility" || themeId === "electrical") {
    return "mechanical_hum";
  }
  if (themeId === "hotel") {
    return "quiet_jazz_bleed";
  }
  if (themeId === "poolrooms") {
    return "water_room_tone";
  }
  return "fluorescent_hum";
}

function defaultHumLevel(themeId: ThemeId, rng: SeededRandom): number {
  const base = themeId === "utility" || themeId === "electrical" ? 0.74 : themeId === "hotel" ? 0.38 : themeId === "poolrooms" ? 0.24 : 0.64;
  return base + rng.next() * 0.16;
}

function defaultReverbProfile(themeId: ThemeId): string {
  if (themeId === "utility" || themeId === "electrical") {
    return "metal_corridor";
  }
  if (themeId === "hotel") {
    return "soft_long_hall";
  }
  if (themeId === "poolrooms") {
    return "wet_tile_echo";
  }
  return "carpeted_low_ceiling";
}

function normalizeHazardMix(themeId: ThemeId, dangerClass: DangerClass): Record<"environmental" | "entity" | "deception", number> {
  const environmental = themeId === "utility" || themeId === "electrical" ? 0.46 : 0.32;
  const entity = dangerClass >= 3 ? 0.36 : dangerClass <= 1 ? 0.1 : 0.24;
  const deception = themeId === "hotel" ? 0.42 : themeId === "office_yellow" ? 0.34 : 0.24;
  const total = environmental + entity + deception;
  return {
    environmental: round2(environmental / total),
    entity: round2(entity / total),
    deception: round2(deception / total)
  };
}

function defaultEntityFamily(themeId: ThemeId, dangerClass: DangerClass): string[] {
  if (dangerClass === 0) {
    return [];
  }
  if (themeId === "utility" || themeId === "electrical") {
    return dangerClass >= 3 ? ["smiler", "hound"] : ["stalker"];
  }
  if (themeId === "hotel") {
    return ["mimic"];
  }
  return dangerClass >= 3 ? ["hound"] : ["stalker"];
}

function normalizeEventWeights(partial: Partial<EventWeights> | undefined, dangerClass: DangerClass): EventWeights {
  const raw: EventWeights = {
    ambient: partial?.ambient ?? 0.26,
    structural: partial?.structural ?? 0.2,
    resource: partial?.resource ?? 0.12,
    deception: partial?.deception ?? 0.17,
    entity: partial?.entity ?? 0.1 + dangerClass * 0.025,
    chase: partial?.chase ?? (dangerClass >= 3 ? 0.08 : 0.04)
  };
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  return {
    ambient: round2(raw.ambient / total),
    structural: round2(raw.structural / total),
    resource: round2(raw.resource / total),
    deception: round2(raw.deception / total),
    entity: round2(raw.entity / total),
    chase: round2(raw.chase / total)
  };
}

function enforceResourceFloor(budget: ResourceBudget, dangerClass: DangerClass, expectedRunMinutes: number): ResourceBudget {
  const normalized = { ...budget };
  let deficit = minimumSurvivalBudget(dangerClass, expectedRunMinutes) - normalized.water - normalized.battery;
  while (deficit > 0) {
    if (normalized.water <= normalized.battery) {
      normalized.water += 1;
    } else {
      normalized.battery += 1;
    }
    deficit -= 1;
  }
  return normalized;
}

function minimumSurvivalBudget(dangerClass: DangerClass, expectedRunMinutes: number): number {
  if (dangerClass >= 3) {
    return Math.max(8, Math.ceil(expectedRunMinutes / 5) + dangerClass);
  }
  if (dangerClass >= 1) {
    return Math.max(4, Math.ceil(expectedRunMinutes / 8) + dangerClass);
  }
  return Math.max(2, Math.ceil(expectedRunMinutes / 14));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

class RngStreamRegistry {
  private readonly streams = new Map<StreamName, SeededRandom>();

  constructor(
    private readonly seed: string,
    private readonly width: number
  ) {}

  stream(name: StreamName): SeededRandom {
    const existing = this.streams.get(name);
    if (existing) {
      return existing;
    }
    const stream = new SeededRandom(`${this.seed}:${this.width}:${name}`);
    this.streams.set(name, stream);
    return stream;
  }
}
