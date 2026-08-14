import {NS} from "@ns";
import { CacheEntry, GetGrowthRequiredMultiplier, GetMoneyDiff, GetOpenRAM, GetSecDiff, SCRIPTS } from "../lib/cache";
import { GetAgents, GetCache } from "./cacher";
import { TARGET_PORT } from "../lib/ports";

export function GetHighestGrowSecAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry): CacheEntry {
}

export function AssignGWJob(ns: NS, cache: CacheEntry[], victim: CacheEntry): boolean {

    var agents = GetAgents(ns, cache);
    if (agents.length === 0) return false;
    agents.sort((a, b) => ((a.weakenMult ?? 0) - (b.weakenMult ?? 0)));
    const mult = ns.getServerMaxMoney(victim.hostname) / ns.getServerMoneyAvailable(victim.hostname);
    let growAgent;
    let growThreads;
    let weakenAgent;
    let weakenThreads;
    let agent;
    for (var i = 0; i < agents.length; i++) {
        agent = agents[i];
        if (growAgent === undefined && weakenAgent === undefined) {
            growThreads = Math.ceil(ns.growthAnalyze(victim.hostname, mult, agent.cpuCores));
            if (GetOpenRAM(ns, agent, true) >= growThreads * ns.getScriptRam(SCRIPTS.grow, agent.hostname)) {
                growAgent = agent;
                i = 0;
                continue;
            }
        }
        if (growAgent !== undefined && weakenAgent === undefined) {
            weakenThreads = Math.ceil(ns.growthAnalyzeSecurity(growThreads!, growAgent!.hostname, growAgent!.cpuCores) / (agent.weakenMult ?? 0));
            if (GetOpenRAM(ns, agent, true) >= weakenThreads * ns.getScriptRam(SCRIPTS.weaken, agent.hostname)) {
                weakenAgent = agent;
                break;
            }
        }
    }
}

export function DistributeWeakenJob(ns: NS, cache: CacheEntry[], victim: CacheEntry, diff: number): boolean {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x) >= 1.7);
    if (agents.length === 0) return false;
    agents.sort((a, b) => ((a.weakenMult ?? 0) - (b.weakenMult ?? 0)));
    let threads = 0;
    let diffLeft = diff;
    let jobs = new Map<string, number>();
    for (var agent of agents) {
        if (diffLeft <= 0) break;
        var ram = ns.getScriptRam(SCRIPTS.weaken, agent.hostname);
        threads = Math.floor(GetOpenRAM(ns, agent, true) / ram);
        if (threads <= 0) threads = 1;
        diffLeft -= ns.weakenAnalyze(threads, agent.cpuCores);
        jobs.set(agent.hostname, threads);
    }
    if (jobs.size <= 0) return false;
    var pids = [];
    for (var [hostname, threadCount] of jobs) {
        pids.push(ns.exec(SCRIPTS.weaken, hostname, threadCount, victim.hostname));
    }
    if (pids.includes(0)) {
        for (var pid of pids) {
            ns.kill(pid);
        }
        return false;
    }
    return true;
}

export function AssignBestWeakenAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry, diff: number): boolean {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x) >= 1.7);
    if (agents.length === 0) return false;
    agents.sort((a, b) => ((a.weakenMult ?? 0) - (b.weakenMult ?? 0)));
    let winner;
    let threads = 0;
    for (var agent of agents) {
        threads = Math.ceil(diff / (agent.weakenMult ?? 0));
        var ram = ns.getScriptRam(SCRIPTS.weaken, agent.hostname);
        if (GetOpenRAM(ns, agent, true) > threads * ram) {
            winner = agent;
            break;
        }
    }
    if (winner === undefined) return DistributeWeakenJob(ns, cache, victim, diff);
    if (ns.exec(SCRIPTS.weaken, winner.hostname, threads, victim.hostname)) return true;
    return false;
}


export function AssignBestGrowAgent(ns: NS, cache: CacheEntry[], victim: CacheEntry, diff: number): boolean {
    var agents = cache.filter((x) => x.isAgent && GetOpenRAM(ns, x) >= 1.7);
    if (agents.length === 0) return false;
	agents.sort((a, b) => b.cpuCores - a.cpuCores);
	let threads = 0;
	let ram = 0;
	let winner;
	for (const agent of agents) {
		threads = Math.ceil(ns.growthAnalyze(victim.hostname, GetGrowthRequiredMultiplier(ns, victim), agent.cpuCores));
		ram = ns.getScriptRam(SCRIPTS.grow, agent.hostname) * threads;
		if (GetOpenRAM(ns, agent, true) > ram) {
			winner = agent;
			break;
		}
	}
	if (winner === undefined) {
		winner = agents[0];
        threads = Math.floor(GetOpenRAM(ns, winner, true) / ns.getScriptRam(SCRIPTS.grow, winner.hostname));
	}
    if (ns.exec(SCRIPTS.grow, winner.hostname, threads, victim.hostname)) {
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
        if (threads < 1) continue;
		ram = ns.getScriptRam(SCRIPTS.hack, agent.hostname) * threads;
		if (GetOpenRAM(ns, agent, true) > ram) {
			winner = agent;
			break;
		}
	}
	if (winner === undefined) {
		winner = agents[0];
        threads = Math.floor(GetOpenRAM(ns, winner) / ns.getScriptRam(SCRIPTS.hack, winner.hostname));
	}
    if (ns.exec(SCRIPTS.hack, winner.hostname, threads, victim.hostname)) {
        return true;
    }
	return false;
}

export async function main(ns: NS) {
    while (true) {
        if (!ns.isRunning("/scripts/daemon/cacher.js")) {
            await ns.sleep(5000);
            continue;
        }
        const servers = GetCache(ns) as Array<CacheEntry> | undefined;
        if (servers === undefined || typeof(servers) === "string") {
            ns.tprintRaw(`[WARN] Batcher is unable to find the cache!`);
            await ns.sleep(5000);
            continue;
        }

        const targets = ns.peek(TARGET_PORT) as Set<string> | string;
        const agents = GetAgents(ns, servers);

        for (const server of servers) {
            if (!server.isVictim || (typeof(targets) !== "string" && targets.has(server.hostname))) continue;
            const diff = GetSecDiff(ns, server);
            if (diff > 0 && ns.getWeakenTime(server.hostname) <= 60 * 60 * 1000) {
                AssignBestWeakenAgent(ns, servers, server, diff);
				continue;
            }
			const moneyDiff = GetMoneyDiff(ns, server);
			if (moneyDiff > 0 && ns.getGrowTime(server.hostname) <= 60 * 60 * 1000) {
                ns.tprintRaw(`${server.hostname} ${moneyDiff}`);
				AssignBestGrowAgent(ns, servers, server, diff);
                continue;
			}
            /*
            if (ns.getServerRequiredHackingLevel(server.hostname) <= ns.getPlayer().skills.hacking && moneyDiff === 0 && diff === 0 && ns.getHackTime(server.hostname) < 60 * 60 * 1000) {
                AssignBestHackAgent(ns, servers, server, 0.50);
            }
                */
        }
        await ns.sleep(5000);
    }
}