export function CalcWeakenThreads(diff: number, cores: number): number {
    if (diff <= 0 || cores <= 0) return 0;
    return Math.ceil(diff / (0.05 * (1 + (cores - 1) / 16)));
}