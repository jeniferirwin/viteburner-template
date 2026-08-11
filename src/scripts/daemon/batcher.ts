import {NS} from "@ns";
import { CacheEntry, GetGrowthRequiredMultiplier, GetMoneyDiff, GetOpenRAM, GetSecDiff, SCRIPTS } from "../lib/cache";
import { GetCache } from "./cacher";
import { TARGET_PORT } from "../lib/ports";

export function AssignBestWeakenAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry, diff: number): boolean {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x) >= 1.7);
    agents.sort((a, b) => ((a.weakenMult ?? 0) - (b.weakenMult ?? 0)));
    let winner;
    let threads = 0;
    for (var agent of agents) {
        threads = Math.ceil(diff / (agent.weakenMult ?? 0));
        var ram = ns.getScriptRam(SCRIPTS.weaken, agent.hostname);
        if (GetOpenRAM(ns, agent) > threads * ram) {
            winner = agent;
            break;
        }
    }
    if (winner === undefined) {
        winner = agents[0];
        threads = Math.floor(GetOpenRAM(ns, winner) / ns.getScriptRam(SCRIPTS.weaken, winner.hostname));
    }
    if (ns.exec(SCRIPTS.weaken, winner.hostname, threads, victim.hostname)) {
        // ns.tprintRaw(`[WEAKEN] ${winner.hostname} (${threads * (winner.weakenMult ?? 0)}) vs. ${victim.hostname} (${GetSecDiff(ns, victim)}) with ${threads} threads`);
        return true;
    }
    return false;
}


export function AssignBestGrowAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry, diff: number): boolean {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x) >= 1.7);
	agents.sort((a, b) => b.cpuCores - a.cpuCores);
	let threads = 0;
	let ram = 0;
	let winner;
	for (const agent of agents) {
		threads = ns.growthAnalyze(victim.hostname, GetGrowthRequiredMultiplier(ns, victim), agent.cpuCores);
		ram = ns.getScriptRam(SCRIPTS.grow, agent.hostname) * threads;
		if (GetOpenRAM(ns, agent) > ram) {
			winner = agent;
			break;
		}
	}
	if (winner === undefined) {
		winner = agents[0];
	}
<<<<<<< Updated upstream
=======
    if (ns.exec(SCRIPTS.grow, winner.hostname, threads, victim.hostname)) {
        // ns.tprintRaw(`[GROW] ${winner.hostname} vs. ${victim.hostname} with ${threads} threads`);
        return true;
    }
	return false;
}

export function AssignBestHackAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry, percent: number) {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x) >= 1.7);
    if (agents.length === 0) return false;
	agents.sort((a, b) => GetOpenRAM(ns, b) - GetOpenRAM(ns, a));
	let threads = 0;
	let ram = 0;
	let winner;
	for (const agent of agents) {
		threads = Math.ceil(ns.hackAnalyzeThreads(victim.hostname, ns.getServerMoneyAvailable(victim.hostname) * percent));
		ram = ns.getScriptRam(SCRIPTS.hack, agent.hostname) * threads;
		if (GetOpenRAM(ns, agent) > ram) {
			winner = agent;
			break;
		}
	}
	if (winner === undefined) {
		winner = agents[0];
        threads = Math.floor(GetOpenRAM(ns, winner) / ns.getScriptRam(SCRIPTS.hack, winner.hostname));
	}
    if (ns.exec(SCRIPTS.hack, winner.hostname, threads, victim.hostname)) {
        // ns.tprintRaw(`[HACK] ${winner.hostname} vs. ${victim.hostname} with ${threads} threads`);
        return true;
    }
>>>>>>> Stashed changes
	return false;
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
            if (!server.isVictim || (typeof(targets) !== "string" && targets.has(server.hostname))) continue;
            const diff = GetSecDiff(ns, server);
            if (diff > 0) {
                AssignBestWeakenAgent(ns, servers, server, diff);
				continue;
            }
			const moneyDiff = GetMoneyDiff(ns, server);
			if (moneyDiff > 0) {
				AssignBestGrowAgent(ns, servers, server, diff);
			}
        }
        await ns.sleep(5000);
    }
}