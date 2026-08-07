import {NS} from "@ns";
import { VictimState, CacheDB, CacheEntry } from "./cacher";


export function AgentsWithEnoughRAM(ns: NS, script: string, servers: CacheDB, threads: number = 1): Array<CacheEntry> {
    const agents = new Array<CacheEntry>();
    for (var server of servers.entries.filter((entry) => entry.GetOpenRAM(ns) > entry.GetThreadedRAM(ns, script, threads)))
        agents.push(server);
    return agents;
}

export function FindBestWeakenAgent(ns: NS, servers: CacheDB, target: string): CacheEntry | undefined {

}
export function BatteringRam(ns: NS, servers: CacheDB, target: string): boolean {
    var agent;
    for (const server of servers.entries) {
        if (server.isAgent === false) continue;
        if (agent === undefined) {
            agent = server;
            continue;
        }
        if (server.GetOpenRAM(ns) > agent.GetOpenRAM(ns)) {
            agent = server;
        }
    }
    if (agent === undefined) return false;
    const diff = servers.get(target)?.GetSecDiff(ns);
    if (diff === undefined) return false;
    var threads = Math.ceil(diff / (0.05 * agent.GetWeakenCoreBonus()));
    var total = agent.get
}

export async function main(ns: NS) {
    while (true) {
        if (!ns.isRunning("/scripts/daemon/cacher.js")) {
            await ns.sleep(5000);
            continue;
        }
        const servers = ns.peek(CACHE_PORT) as CacheDB | string;
        if (typeof(servers) === "string") {
            await ns.sleep(5000);
            continue;
        }
        for (var server of servers.entries) {
            if (server.GetVictimState(ns) === VictimState.SECURE) {
            }
        }
        await ns.sleep(5000);
    }
}