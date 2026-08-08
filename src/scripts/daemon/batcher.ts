import {NS, RecentScript} from "@ns";
import { CacheEntry, GetOpenRAM, GetThreadedRAM, SCRIPTS } from "../lib/cache";
import { GetCache } from "./cacher";

export function GetBestAgent(ns: NS, cache: CacheEntry[], script: string, threads: number = 1): CacheEntry {
    const agents = new Array<CacheEntry>();
    for (var server of cache.filter((entry) => GetOpenRAM(ns, entry) > GetThreadedRAM(ns, entry, script, threads)))
        agents.push(server);
    agents.sort((a, b) => b.cpuCores - a.cpuCores);
    return agents[0];
}

export async function main(ns: NS) {
    const cache = GetCache(ns);
    if (cache === undefined) return;
    const agent = GetBestAgent(ns, cache, SCRIPTS.weaken, 5);
    while (true) {
        if (!ns.isRunning("/scripts/daemon/cacher.js")) {
            await ns.sleep(5000);
            continue;
        }
        const servers = GetCache(ns);
        if (cache === undefined || typeof(servers) === "string") {
            ns.tprintRaw(`[WARN] Batcher is unable to find the cache!`);
            await ns.sleep(5000);
            continue;
        }
        for (var server of servers.entries) {
        }
        await ns.sleep(5000);
    }
}