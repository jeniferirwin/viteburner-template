import {NS} from "@ns";
import { CACHE_PORT } from "../lib/const";
import { IsVictim } from "../lib/server";
import { IsBeingAttacked, IsPrepped } from "../lib/attack";

export function getIdleVictims(ns: NS, servers: Array<CacheEntry>): Set<string> {
    var victims = new Set<string>();
    for (const server of servers) {
        if (IsVictim(ns, server) && !IsBeingAttacked(ns, servers, server))
            victims.add(server)
    }
    return victims;
}

export async function main(ns: NS) {
    while (true) {
        if (!ns.isRunning("/scripts/daemon/cacher.js")) {
            await ns.sleep(5000);
            continue;
        }
        const servers = ns.peek(CACHE_PORT);
        if (servers === "NULL PORT DATA") {
            await ns.sleep(5000);
            continue;
        }
        var victims = getIdleVictims(ns, servers);
        for (var victim of victims) {
            if (IsPrepped(ns, servers, victim)) {
            } else {

            }
        }
        await ns.sleep(5000);
    }
}