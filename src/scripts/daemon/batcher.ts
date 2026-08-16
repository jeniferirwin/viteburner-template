import {NS, BasicHGWOptions} from "@ns";
import { GetSecDiff, GetMoneyDiff, GetGrowthRequiredMultiplier, CacheEntry, GetOpenRAM, GetAgents, GetCache, GetVictims, TotalRAM, WeakenTable } from "./cacher";
import { SCRIPTS } from "../config";

export class GrowTask {
    targetThreads: number = -1;
    possibleThreads: number = -1;
    actualThreads: number = -1;
    threadDelta: number = -1;
    secDiff: number = -1;
    ram: number = -1;
    time: number = -1;
    constructor(ns: NS, public agent: CacheEntry, victim: CacheEntry, public mult?: number = -1, public reserved?: number = 0) {
        if (mult === -1) mult = ns.getServerMaxMoney(victim.hostname) / ns.getServerMoneyAvailable(victim.hostname);
        this.time = ns.getGrowTime(victim.hostname);
        this.targetThreads = Math.ceil(ns.growthAnalyze(agent.hostname, mult, agent.cpuCores));
        this.possibleThreads = Math.floor((GetOpenRAM(ns, agent, true) + reserved) / ns.getScriptRam(SCRIPTS.grow, agent.hostname));
        this.threadDelta = this.targetThreads - this.possibleThreads;
        if (this.threadDelta > 0) {
            this.actualThreads = this.possibleThreads;
        } else {
            this.actualThreads = this.targetThreads;
        }
        this.secDiff = ns.growthAnalyzeSecurity(this.actualThreads, "", agent.cpuCores);
        this.ram = ns.getScriptRam(SCRIPTS.grow, agent.hostname) * this.actualThreads;
    }
}

export class WeakenTask {
    targetThreads: number = -1;
    possibleThreads: number = -1;
    actualThreads: number = -1;
    threadDelta: number = -1;
    secDiff: number = -1;
    ram: number = -1;
    time: number = -1;
    constructor(ns: NS, public agent: CacheEntry, victim: CacheEntry, public diff?: number = undefined, public reserved?: number = 0) {
        if (diff === undefined) diff = ns.getServerSecurityLevel(victim.hostname) - ns.getServerMinSecurityLevel(victim.hostname);
        this.time = ns.getWeakenTime(victim.hostname);
        this.targetThreads = Math.ceil(diff / (agent.weakenMult ?? 0));
        this.possibleThreads = Math.floor((GetOpenRAM(ns, agent, true) + reserved) / ns.getScriptRam(SCRIPTS.weaken, agent.hostname));
        this.threadDelta = this.targetThreads - this.actualThreads;
        if (this.threadDelta > 0) {
            this.actualThreads = this.possibleThreads;
        } else {
            this.actualThreads = this.targetThreads;
        }
        this.secDiff = ns.weakenAnalyze(this.actualThreads, agent.cpuCores);
        this.ram = ns.getScriptRam(SCRIPTS.weaken, agent.hostname) * this.actualThreads;
    }
}

export class HackTask {
    targetThreads: number = -1;
    possibleThreads: number = -1;
    actualThreads: number = -1;
    threadDelta: number = -1;
    secDiff: number = -1;
    ram: number = -1;
    constructor(ns: NS, public agent: CacheEntry, victim: CacheEntry, public percent?: number = 25) {
        this.targetThreads = Math.ceil((percent / 100) / ns.hackAnalyze(victim.hostname));
        this.possibleThreads = Math.floor(GetOpenRAM(ns, agent, true) / ns.getScriptRam(SCRIPTS.hack, agent.hostname));
        this.threadDelta = this.targetThreads - this.actualThreads;
        if (this.threadDelta > 0) {
            this.actualThreads = this.possibleThreads;
        } else {
            this.actualThreads = this.targetThreads;
        }
        this.secDiff = ns.hackAnalyzeSecurity(this.actualThreads);
        this.ram = ns.getScriptRam(SCRIPTS.hack, agent.hostname) * this.actualThreads;
    }
}

export function AssignFullBatch(ns: NS, cache: CacheEntry[], victim: CacheEntry): Array<number> | undefined {
    var agents = GetAgents(ns, cache);
    if (agents.length === 0) return undefined;
    agents.sort((a, b) => ((b.cpuCores) - (a.cpuCores)));
    const hackTasks = new Array<HackTask>();
    const firstWeakenTasks = new Array<WeakenTask>();
    const growTasks = new Array<GrowTask>();
    const secondWeakenTasks = new Array<WeakenTask>();
    let hackTaskWinner, firstWeakenTaskWinner, growTaskWinner, secondWeakenTaskWinner;
    const accumulatedRAM = new Map<string, number>();

    for (const agent of agents) {
        const task = new HackTask(ns, agent, victim, 10);
        if (task.threadDelta < 0) {
            hackTaskWinner = task;
            break;
        } 
        if (task.possibleThreads >= 1) hackTasks.push(task);
    }

    if (hackTaskWinner === undefined) hackTaskWinner = hackTasks.sort((a, b) => a.threadDelta - b.threadDelta)[0];

    accumulatedRAM.set(hackTaskWinner.agent.hostname, hackTaskWinner.ram);

    for (const agent of agents) {
        const task = new WeakenTask(ns, agent, victim, hackTaskWinner.secDiff, accumulatedRAM.get(agent.hostname));
        if (task.threadDelta < 0) {
            firstWeakenTaskWinner = task;
            break;
        }
        if (task.possibleThreads >= 1) firstWeakenTasks.push(task);
    }

    if (firstWeakenTaskWinner === undefined) {
        const sorted = firstWeakenTasks.sort((a, b) => a.threadDelta - b.threadDelta);
    }

    for (const agent of agents) {
        const task = new GrowTask(ns, agent, victim, 1.1);
        if (task.threadDelta < 0) {
            growTaskWinner = task;
            break;
        }
        if (task.possibleThreads >= 1) growTasks.push(task);
    }

    if (growTaskWinner === undefined) growTaskWinner = 
}

export function AssignGWJob(ns: NS, cache: CacheEntry[], victim: CacheEntry): Array<number> | undefined {
    var agents = GetAgents(ns, cache);
    if (agents.length === 0) return undefined;
    agents.sort((a, b) => ((b.cpuCores) - (a.cpuCores)));
    const growTasks = new Array<GrowTask>();
    const weakenTasks = new Array<WeakenTask>();
    let growTaskWinner;
    let weakenTaskWinner;

    for (const agent of agents) {
        const task = new GrowTask(ns, agent, victim);
        if (task.threadDelta < 0) {
            growTaskWinner = task;
            break;
        }
        if (task.possibleThreads >= 1) growTasks.push(task);
    }

    if (growTaskWinner === undefined) {
        growTasks.sort((a, b) => a.threadDelta - b.threadDelta);
        growTaskWinner = growTasks[0];
    }

    for (const agent of agents) {
        const task = new WeakenTask(ns, agent, victim, growTaskWinner.secDiff);
        if (task.threadDelta < 0) {
            if (task.agent.hostname !== growTaskWinner.agent.hostname) {
                weakenTaskWinner = task;
                break;
            }
            if (growTaskWinner.ram + task.ram > GetOpenRAM(ns, task.agent, true)) continue;
        }
        if (task.possibleThreads >= 1) weakenTasks.push(task);
    }

    if (weakenTaskWinner === undefined) {
        weakenTasks.sort((a, b) => a.threadDelta - b.threadDelta);
        weakenTaskWinner = weakenTasks[0];
    }

    const pids = new Array<number>();
    const growPadTime = weakenTaskWinner.time - growTaskWinner.time - 10;
    pids.push(ns.exec(SCRIPTS.grow, growTaskWinner.agent.hostname, growTaskWinner.actualThreads, victim.hostname, growPadTime))
    pids.push(ns.exec(SCRIPTS.weaken, weakenTaskWinner.agent.hostname, weakenTaskWinner.actualThreads, victim.hostname));
    if (pids.includes(0)) {
        for (var pid of pids) if (pid > 0) ns.kill(pid);
        return undefined;
    }
    return pids;
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

export function TrySetup(ns: NS): any | undefined {
    if (!ns.isRunning("/scripts/daemon/cacher.js")) {
        ns.tprintRaw(`[WARN] Cacher is not running!`);
        return undefined;
    }
    const servers = GetCache(ns) as Array<CacheEntry> | undefined;
    if (servers === undefined || typeof(servers) === "string") {
        ns.tprintRaw(`[WARN] Batcher is unable to find the cache!`);
        return undefined;
    }

    const agents = GetAgents(ns, servers);
    if (agents.length <= 0) {
        ns.tprintRaw(`[WARN] No agents found in server cache!`);
        return undefined;
    }

    const victims = GetVictims(ns, servers, true);

    if (victims.length <= 0) {
        ns.tprintRaw(`[WARN] No victims found in server cache!`);
        return undefined;
    }

    return { agents: agents, victims: victims };
}

export async function main(ns: NS) {
    while (true) {
        const data: any = TrySetup(ns);
        if (data === undefined) {
            await ns.sleep(5000);
            continue;
        }
        data.victims.sort((a: CacheEntry, b: CacheEntry) => ns.getServerRequiredHackingLevel(a.hostname) - ns.getServerRequiredHackingLevel(b.hostname));
        for (const victim of data.victims) {
            const diff = GetSecDiff(ns, victim);
            if (diff > 0 && ns.getWeakenTime(victim.hostname) <= 60 * 60 * 1000) {
                AssignBestWeakenAgent(ns, data.agents, victim, diff);
				continue;
            }
			const moneyDiff = GetMoneyDiff(ns, victim);
			if (moneyDiff > 0 && ns.getGrowTime(victim.hostname) <= 60 * 60 * 1000) {
				AssignGWJob(ns, data.agents, victim);
                continue;
			}
        }
        await ns.sleep(5000);
    }
}