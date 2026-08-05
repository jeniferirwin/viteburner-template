import {NS} from "@ns";
import { GetAllServerNames } from "../lib/server";
import { CrackPorts, IsNukable, PutBundle } from "../lib/attack";
import { CACHE_PORT } from "../lib/const";

export async function main(ns: NS) {
    while (true) {
        const servers = GetAllServerNames(ns);
        const cache = new Map<string, number>();
        for (const server of servers) {
            if (!ns.hasRootAccess(server)) {
                CrackPorts(ns, server);
                if (IsNukable(ns, server)) if (ns.nuke(server)) PutBundle(ns, server);
            }
            cache.set(server, ns.getServer(server).cpuCores);
        }
        ns.clearPort(CACHE_PORT);
        ns.tryWritePort(CACHE_PORT, cache);
        await ns.sleep(10000);
    }
}