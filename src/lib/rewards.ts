export const POINTS_PER_JOURNAL_ENTRY = 25;

export function rewardLevelFromPoints(points: number): number {
  const p = Math.max(0, Math.floor(Number(points)) || 0);
  if (p < 100) return 1;
  if (p < 250) return 2;
  if (p < 450) return 3;
  if (p < 700) return 4;
  if (p < 1000) return 5;
  if (p < 1400) return 6;
  if (p < 1900) return 7;
  if (p < 2500) return 8;
  if (p < 3200) return 9;
  return Math.min(20, 10 + Math.floor((p - 3200) / 800) + 1);
}

export function nextLevelThresholdPoints(currentPoints: number): number | null {
  const lvl = rewardLevelFromPoints(currentPoints);
  if (lvl >= 20) return null;
  const p = Math.max(0, Math.floor(Number(currentPoints)) || 0);
  for (let step = 1; step <= 10000; step++) {
    if (rewardLevelFromPoints(p + step) > lvl) return p + step;
  }
  return null;
}

export function rewardLevelLabel(level: number): string {
  if (level >= 7) return "Seasoned";
  if (level >= 5) return "Disciplined";
  if (level >= 4) return "Reflective";
  if (level >= 3) return "Steady";
  if (level >= 2) return "Building";
  return "Starting";
}
