import type { GeneratedMap } from "../game/types";
import type { SceneStats } from "../render/backroomsScene";

export interface HudElements {
  seedInput: HTMLInputElement;
  sizeSelect: HTMLSelectElement;
  generateButton: HTMLButtonElement;
  randomButton: HTMLButtonElement;
  copyButton: HTMLButtonElement;
  startButton: HTMLButtonElement;
  startOverlay: HTMLElement;
  statusText: HTMLElement;
  mapStats: HTMLElement;
  fpsMeter: HTMLElement;
  touchControls: TouchControlElements;
}

export interface TouchControlElements {
  container: HTMLElement;
  moveZone: HTMLElement;
  moveKnob: HTMLElement;
  lookZone: HTMLElement;
  runButton: HTMLButtonElement;
}

export function getHudElements(): HudElements {
  return {
    seedInput: getElement("seed-input", HTMLInputElement),
    sizeSelect: getElement("size-select", HTMLSelectElement),
    generateButton: getElement("generate-button", HTMLButtonElement),
    randomButton: getElement("random-button", HTMLButtonElement),
    copyButton: getElement("copy-button", HTMLButtonElement),
    startButton: getElement("start-button", HTMLButtonElement),
    startOverlay: getElement("start-overlay", HTMLElement),
    statusText: getElement("status-text", HTMLElement),
    mapStats: getElement("map-stats", HTMLElement),
    fpsMeter: getElement("fps-meter", HTMLElement),
    touchControls: {
      container: getElement("touch-controls", HTMLElement),
      moveZone: getElement("touch-move-zone", HTMLElement),
      moveKnob: getElement("touch-move-knob", HTMLElement),
      lookZone: getElement("touch-look-zone", HTMLElement),
      runButton: getElement("touch-run-button", HTMLButtonElement)
    }
  };
}

export function updateMapHud(elements: HudElements, map: GeneratedMap, stats: SceneStats): void {
  elements.seedInput.value = map.seed;
  syncSizeSelect(elements.sizeSelect, map.width);
  const summary = `${themeLabel(map.experience.theme.themeId)} · D${map.experience.danger.dangerClass} · ${map.validation.passable ? "validated" : "review"}`;
  elements.statusText.dataset.mapSummary = summary;
  elements.statusText.textContent = summary;
  elements.mapStats.textContent = `${map.openCount} cells · ${map.roomCount} rooms · ${map.loopCount} loops · ${map.falseExits.length} false exits · ${stats.wallCount} walls · ${map.validation.exitDistance} route`;
}

export function updatePerfHud(elements: HudElements, fps: number, stats: SceneStats): void {
  if (fps > 0) {
    elements.fpsMeter.textContent = `${fps} FPS · ${stats.drawCalls} draws`;
  }
}

export function setPointerLocked(elements: HudElements, locked: boolean): void {
  document.body.classList.toggle("is-pointer-locked", locked);
  elements.startOverlay.classList.toggle("is-hidden", locked);
  elements.statusText.textContent = locked ? "Exploring" : (elements.statusText.dataset.mapSummary ?? "Paused");
}

function getElement<T extends HTMLElement>(id: string, constructor: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}

function syncSizeSelect(select: HTMLSelectElement, size: number): void {
  const value = String(size);
  const knownOption = Array.from(select.options).some((option) => option.value === value);
  if (!knownOption) {
    let customOption = Array.from(select.options).find((option) => option.dataset.generatedSize === "true");
    if (!customOption) {
      customOption = new Option();
      customOption.dataset.generatedSize = "true";
      select.add(customOption, select.options[0] ?? null);
    }
    customOption.value = value;
    customOption.textContent = `Custom ${value}`;
  }
  select.value = value;
}

function themeLabel(themeId: GeneratedMap["experience"]["theme"]["themeId"]): string {
  return themeId
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
