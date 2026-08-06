import { NS } from "@ns";

export const SCRIPTS = {
    hack: "/scripts/task/atk_hack.js",
    weaken: "/scripts/task/atk_weaken.js",
    grow: "/scripts/task/atk_grow.js"
}

export const CACHE_PORT = 1;

export function GetTotalRAM(ns: NS, script: string, threads: number = 1): number {
    threads = Math.round(threads);
    if (threads < 1 && threads >= Number.POSITIVE_INFINITY) return 0;
    return threads * ns.getScriptRam(script, "home");
}