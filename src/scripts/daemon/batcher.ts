import {NS} from "@ns";
import { CacheEntry, GetOpenRAM, GetSecDiff, SCRIPTS } from "../lib/cache";
import { GetCache } from "./cacher";
import { TARGET_PORT } from "../lib/ports";

export const WeakenTable: Array<number> = [0, ...Array.from({length: 199}, (_, i) => 0.05 * (1 + i / 16))];

export interface WeakenStats {
    agent: CacheEntry;
    targetDiff: number;
    multiplier: number;
    threads: number;
    ram: number;
}

export function GetWeakenStats(ns: NS, agent: CacheEntry, victim: CacheEntry): WeakenStats | undefined {
    if (!victim.isVictim) return undefined;
    const diff = GetSecDiff(ns, victim);
    const mult = WeakenTable[agent.cpuCores];
    const threads = Math.ceil(diff / mult);
    const ram = ns.getScriptRam(SCRIPTS.weaken, agent.hostname) * threads;
    var stats: WeakenStats = { agent: agent, targetDiff: diff, multiplier: mult, threads: threads, ram: ram };
    if (stats.threads <= 0) return undefined;
    if (stats.ram <= 0) return undefined;
    return stats;
}

export function GetBestWeakenAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry): WeakenStats | undefined {
    var agent: CacheEntry | undefined = undefined;
    var stats;
    for (var server of cache.filter((entry) => entry.isAgent)) {
        if (agent === undefined) {
            agent = server;
            continue;
        }
        stats = GetWeakenStats(ns, agent, victim);
        if (stats === undefined) continue;
        // ns.tprint(`${server.hostname} (${ns.getServerMaxRam(server.hostname)}) vs. ${agent.hostname}`);
        if (server.cpuCores > agent.cpuCores && stats.ram < GetOpenRAM(ns, server)) {
            agent = server;
            continue;
        }
    }
    if (agent === undefined) return undefined;
    return stats;
}

export async function main(ns: NS) {
    while (true) {
        if (!ns.isRunning("/scripts/daemon/cacher.js")) {
            await ns.sleep(5000);
            continue;
        }
        const servers = GetCache(ns) as Array<CacheEntry> | undefined;
        const targets = ns.peek(TARGET_PORT) as Set<string> | string;
        if (servers === undefined || typeof(servers) === "string") {
            ns.tprintRaw(`[WARN] Batcher is unable to find the cache!`);
            await ns.sleep(5000);
            continue;
        }
        for (const server of servers) {
            if (!server.isVictim ||
                (typeof(targets) !== "string" && targets.has(server.hostname))) {
                continue;
            }
            const diff = GetSecDiff(ns, server);
            if (diff > 0) {
                const results = GetBestWeakenAgent(ns, servers, server);
                if (results === undefined) {
                    continue;
                }
                const pid = ns.exec(SCRIPTS.weaken, results.agent.hostname, results.threads, server.hostname);
                if (pid === 0) continue;
                ns.tprintRaw(`[Started weaken attack against ${server.hostname} with ${results.threads} threads using ${results.ram} RAM on ${results.agent.hostname} (max ${ns.getServerMaxRam(results.agent.hostname)} RAM)`);
            }
        }
        await ns.sleep(5000);
    }
}