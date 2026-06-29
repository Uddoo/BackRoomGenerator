import "./style.css";
import { PerfMeter } from "./diagnostics/perf";
import { cellToWorld, generateBackrooms } from "./game/generator";
import { createShareSeed, normalizeSeed } from "./game/random";
import type { GeneratedMap } from "./game/types";
import { BackroomsScene, type SceneStats } from "./render/backroomsScene";
import { FirstPersonController } from "./render/firstPersonController";
import { getHudElements, setPointerLocked, updateMapHud, updatePerfHud } from "./ui/hud";

const viewport = document.getElementById("viewport");
if (!viewport) {
  throw new Error("Missing #viewport container.");
}

const initialParams = new URLSearchParams(window.location.search);
const hud = getHudElements();
const scene = new BackroomsScene(viewport, {
  preserveDrawingBuffer: initialParams.has("qaPixels")
});
const perf = new PerfMeter();
let currentMap: GeneratedMap;
let latestStats: SceneStats;

const controller = new FirstPersonController(scene.camera, scene.renderer.domElement, (locked) => {
  setPointerLocked(hud, locked);
});

function readInitialSeed(): string {
  return initialParams.has("seed") ? normalizeSeed(initialParams.get("seed")) : createShareSeed();
}

function readInitialSize(): number {
  const size = Number(initialParams.get("size"));
  return Number.isFinite(size) ? size : Number(hud.sizeSelect.value);
}

function loadMap(seed: string, size: number, updateHistory = true): void {
  currentMap = generateBackrooms(seed, size);
  scene.setMap(currentMap);
  const spawn = cellToWorld(currentMap, currentMap.spawn);
  controller.teleport(spawn);
  latestStats = scene.render();
  updateMapHud(hud, currentMap, latestStats);

  if (updateHistory) {
    const params = new URLSearchParams();
    params.set("seed", currentMap.seed);
    params.set("size", String(currentMap.width));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  }
}

Object.assign(window, {
  __BACKROOM_DEBUG__: {
    getState: () => ({
      seed: currentMap.seed,
      width: currentMap.width,
      openCount: currentMap.openCount,
      wallCount: latestStats.wallCount,
      drawCalls: latestStats.drawCalls,
      camera: {
        x: scene.camera.position.x,
        y: scene.camera.position.y,
        z: scene.camera.position.z
      }
    })
  }
});

function copyShareLink(): void {
  const link = window.location.href;
  navigator.clipboard
    .writeText(link)
    .then(() => {
      hud.copyButton.textContent = "Copied";
      window.setTimeout(() => {
        hud.copyButton.textContent = "Copy Link";
      }, 1100);
    })
    .catch(() => {
      hud.copyButton.textContent = "Copy Failed";
      window.setTimeout(() => {
        hud.copyButton.textContent = "Copy Link";
      }, 1400);
    });
}

hud.generateButton.addEventListener("click", () => {
  loadMap(hud.seedInput.value, Number(hud.sizeSelect.value));
});

hud.randomButton.addEventListener("click", () => {
  loadMap(createShareSeed(), Number(hud.sizeSelect.value));
});

hud.copyButton.addEventListener("click", copyShareLink);
hud.startButton.addEventListener("click", () => controller.lock());

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    return;
  }

  if (event.code === "KeyN") {
    loadMap(createShareSeed(), Number(hud.sizeSelect.value));
  }

  if (event.code === "KeyR") {
    loadMap(currentMap.seed, currentMap.width);
  }
});

let previousTime = performance.now();
function frame(time: number): void {
  const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;

  controller.update(deltaSeconds, currentMap);
  latestStats = scene.render();
  updatePerfHud(hud, perf.update(deltaSeconds), latestStats);
  window.requestAnimationFrame(frame);
}

loadMap(readInitialSeed(), readInitialSize());
setPointerLocked(hud, false);
window.requestAnimationFrame(frame);

window.addEventListener("beforeunload", () => {
  scene.dispose();
});
