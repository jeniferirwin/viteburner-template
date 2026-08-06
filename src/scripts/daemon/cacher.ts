import {NS, Server} from "@ns";
import { GetAllServerNames } from "../lib/server";
import { CrackPorts, IsNukable, PutBundle } from "../lib/attack";
import { CACHE_PORT } from "../lib/const";

export class CacheEntry {
    hostname: string;
    cpuCores: number;
    backdoorInstalled: boolean;
    purchasedByPlayer: boolean;
    serverGrowth: number;

    constructor(public server: Server) {
        this.hostname = server.hostname;
        this.cpuCores = server.cpuCores;
        this.backdoorInstalled = server.backdoorInstalled ?? false;
        this.purchasedByPlayer = server.purchasedByPlayer;
        this.serverGrowth = server.serverGrowth ?? 0;
    }
}

export class CacheDB {
    entries: Array<CacheEntry> = new Array<CacheEntry>();

    push(entry: CacheEntry) {
        this.entries.push(entry);
    }

    get(hostname: string): CacheEntry | undefined {
        return this.entries.find((entry) => entry.hostname === hostname);
    }

    refresh(ns: NS) {
        this.entries = new Array<CacheEntry>();
        ns.clearPort(CACHE_PORT);
        const servers = GetAllServerNames(ns);
        for (const server of servers) {
            if (!ns.hasRootAccess(server)) {
                CrackPorts(ns, server);
                if (IsNukable(ns, server)) if (ns.nuke(server)) PutBundle(ns, server);
            }
            this.push(new CacheEntry(ns.getServer(server)));
        }
        if (!ns.tryWritePort(CACHE_PORT, this)) {
            ns.tprintRaw(`[WARN] CacheDB failed to update server list!`);
        }
    }
}

export async function main(ns: NS) {
    const db = new CacheDB();
    while (true) {
        db.refresh(ns);
        await ns.sleep(10000);
    }
}