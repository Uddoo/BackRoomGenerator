export class PerfMeter {
  private frameCount = 0;
  private accumulator = 0;
  private latestFps = 0;

  update(deltaSeconds: number): number {
    this.frameCount += 1;
    this.accumulator += deltaSeconds;

    if (this.accumulator >= 0.5) {
      this.latestFps = Math.round(this.frameCount / this.accumulator);
      this.frameCount = 0;
      this.accumulator = 0;
    }

    return this.latestFps;
  }
}
