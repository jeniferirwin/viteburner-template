import { NS } from "@ns";
import { GetAllServerNames } from "../lib/server";
import { CacheEntry, PutBundle, GetOpenRAM } from "../lib/cache";
import { CACHE_PORT } from "../lib/ports";

export function GetAgents(ns: NS, cache: CacheEntry[]): CacheEntry[] {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x, true) >= 1.7);
    return agents;
}

export function GetVictims(cache: CacheEntry[]): CacheEntry[] {
    var victims = cache.filter((x) => x.isVictim);
    return victims;
}

export function GetCacheEntry(ns: NS, hostname: string): CacheEntry | undefined {
    var entries = GetCache(ns);
    if (entries === undefined) return undefined;
    return entries.find((entry) => entry.hostname === hostname);
}

export function GetCache(ns: NS): CacheEntry[] | undefined {
    const entries = ns.peek(CACHE_PORT);
    if (typeof(entries) === "string") return undefined;
    return entries;
}

export function RefreshCache(ns: NS) {
    const entries = new Array<CacheEntry>();
    ns.clearPort(CACHE_PORT);
    const servers = GetAllServerNames(ns);
    for (const server of servers) {
        const entry = new CacheEntry(ns, ns.getServer(server));
        if (!entry.isAgent && !entry.isVictim) continue;
        PutBundle(ns, entry);
        entries.push(entry);
    }
    if (!ns.tryWritePort(CACHE_PORT, entries)) {
        ns.tprintRaw(`[WARN] CacheDB failed to update server list!`);
    }
}

export async function main(ns: NS) {
    while (true) {
        RefreshCache(ns);
        await ns.sleep(10000);
    }
}
