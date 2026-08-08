import { NS } from "@ns";
import { GetAllServerNames } from "../lib/server";
import { CACHE_PORT, CacheEntry } from "../lib/cache";


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
    for (const server of servers) entries.push(new CacheEntry(ns, ns.getServer(server)));
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
