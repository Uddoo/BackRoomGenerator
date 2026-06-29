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

export type Purpose = "game" | "film" | "writing" | "generic";
export type ThemeId = "office_yellow" | "utility" | "electrical" | "office_empty" | "hotel" | "poolrooms" | "mixed";
export type ConnectivityMode = "maze" | "non_euclidean" | "hub_spoke";

export interface ExitDecoy extends GridPoint {
  facing: Direction;
  reliability: number;
}

export interface ResourceBudget {
  water: number;
  battery: number;
  tool: number;
  keyItem: number;
  lure: number;
}

export interface BackroomsExperienceSeed {
  version: 1;
  purpose: Purpose;
  theme: {
    themeId: ThemeId;
    themeMix: Partial<Record<ThemeId, number>>;
    eraProfile: "late_20th_century" | "service_basement" | "liminal_hotel" | "sterile_pool";
    paletteSeed: number;
    wearLevel: number;
  };
  scale: {
    roomBudget: number;
    edgeBudget: number;
    sublevelCount: number;
    expectedRunMinutes: number;
  };
  topology: {
    branchFactor: number;
    loopRatio: number;
    deadEndRatio: number;
    oneWayRatio: number;
    exitCount: number;
    exitReliability: number;
    falseExitRatio: number;
    connectivityMode: ConnectivityMode;
  };
  anomaly: {
    repetitionFactor: number;
    misalignmentFactor: number;
    anomalyModes: string[];
    noiseSeed: number;
  };
  sensory: {
    cct: number;
    lightVariance: number;
    blackoutRatio: number;
    flickerRate: number;
    audioTemplate: string;
    humLevel: number;
    reverbProfile: string;
  };
  danger: {
    dangerClass: 0 | 1 | 2 | 3 | 4 | 5;
    hazardMix: Record<"environmental" | "entity" | "deception", number>;
  };
  resources: {
    budget: ResourceBudget;
    rarity: number;
    fakeResourceRatio: number;
  };
  entities: {
    entityFamily: string[];
    spawnBudget: number;
    territoryRules: {
      darkPreference: number;
      noiseResponse: number;
    };
  };
  events: {
    eventWeights: Record<"ambient" | "structural" | "resource" | "deception" | "entity" | "chase", number>;
    eventCooldowns: {
      minor: number;
      major: number;
    };
    statePersistence: boolean;
  };
  mission: {
    missionTemplate: "wander_to_exit" | "find_exit_via_power_restore" | "document_anomaly" | "survive_false_exit_chase";
    lockKeyProfile: {
      locks: number;
      keys: number;
      softlocksAllowed: number;
    };
  };
  pacing: {
    moodCurve: "slow_burn_3_peaks" | "blackout_pressure" | "false_safety" | "melancholic_drift" | "panic_spikes";
    peakCount: number;
    recoveryFloor: number;
    resourcePressure: number;
  };
  rng: {
    master: string;
    streams: Record<"experience" | "layout" | "rooms" | "sensory" | "resources" | "entities" | "events", number>;
  };
}

export interface MapValidationReport {
  passable: boolean;
  reachableOpenRatio: number;
  exitDistance: number;
  deadEndCount: number;
  actualLoopRatio: number;
  resourceFloorSatisfied: boolean;
  softlockFree: boolean;
  warnings: string[];
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
  spawnFacing: Direction;
  exit: GridPoint;
  exitFacing: Direction;
  falseExits: ExitDecoy[];
  wallSegments: WallSegment[];
  openCount: number;
  roomCount: number;
  loopCount: number;
  experience: BackroomsExperienceSeed;
  validation: MapValidationReport;
}
