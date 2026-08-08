import {NS} from "@ns";
import { CacheEntry, GetOpenRAM, GetThreadedRAM, SCRIPTS } from "../lib/cache";
import { GetCache } from "./cacher";
import { TARGET_PORT } from "../lib/targets";

export function GetBestAgent(ns: NS, cache: CacheEntry[], script: string, threads: number = 1): CacheEntry {
    const agents = new Array<CacheEntry>();
    for (var server of cache.filter((entry) => GetOpenRAM(ns, entry) > GetThreadedRAM(ns, entry, script, threads)))
        agents.push(server);
    agents.sort((a, b) => b.cpuCores - a.cpuCores);
    return agents[0];
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
            if (server.isAgent) continue;
            if (typeof(targets) !== "string" && targets.has(server.hostname)) continue;
            
        }
        await ns.sleep(5000);
    }
}