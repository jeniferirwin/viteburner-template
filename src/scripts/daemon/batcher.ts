import {NS, BasicHGWOptions } from "@ns";
import { GetSecDiff, GetMoneyDiff, CacheEntry, GetOpenRAM, GetAgents, GetCache, GetVictims, GetBestDPS, GetAllOpenRAM } from "./cacher";
import { SCRIPTS } from "../config";

export class HGWTask {
    targetThreads: number = -1;
    possibleThreads: number = -1;
    actualThreads: number = -1;
    threadDelta: number = -1;
    secDiff: number = -1;
    ram: number = -1;
    time: number = -1;
    constructor(public script: string, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {}

    setThreadInfo(ns: NS) {
        this.possibleThreads = Math.floor((GetOpenRAM(ns, this.agent, true) - this.reserved) / ns.getScriptRam(this.script, this.agent.hostname));
        this.threadDelta = this.targetThreads - this.possibleThreads;
        if (this.threadDelta > 0) {
            this.actualThreads = this.possibleThreads;
        } else {
            this.actualThreads = this.targetThreads;
        }
        this.ram = ns.getScriptRam(this.script, this.agent.hostname) * this.actualThreads;
    }
}

export class GrowTask extends HGWTask {
    constructor(ns: NS, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {
        super(SCRIPTS.grow, agent, victim, reserved, HGWMod);
        if (HGWMod === -1) HGWMod = ns.getServerMaxMoney(victim.hostname) / ns.getServerMoneyAvailable(victim.hostname);
        this.time = ns.getGrowTime(victim.hostname);
        this.targetThreads = Math.ceil(ns.growthAnalyze(agent.hostname, HGWMod, agent.cpuCores));
        this.setThreadInfo(ns);
        this.secDiff = ns.growthAnalyzeSecurity(this.actualThreads, undefined, agent.cpuCores);
    }
}

export class WeakenTask extends HGWTask {
    constructor(ns: NS, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {
        super(SCRIPTS.weaken, agent, victim, reserved, HGWMod);
        if (HGWMod === undefined) HGWMod = ns.getServerSecurityLevel(victim.hostname) - ns.getServerMinSecurityLevel(victim.hostname);
        this.time = ns.getWeakenTime(victim.hostname);
        this.targetThreads = Math.ceil(HGWMod / (agent.weakenMult ?? 0));
        this.setThreadInfo(ns);
        this.secDiff = ns.weakenAnalyze(this.actualThreads, agent.cpuCores);
    }
}

export class HackTask extends HGWTask {
    constructor(ns: NS, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {
        super(SCRIPTS.hack, agent, victim, reserved, HGWMod);
        this.targetThreads = Math.ceil((HGWMod / 100) / ns.hackAnalyze(victim.hostname));
        this.time = ns.getHackTime(victim.hostname);
        this.setThreadInfo(ns);
        this.secDiff = ns.hackAnalyzeSecurity(this.actualThreads);
    }
}

export function AssignFullBatch(ns: NS, cache: CacheEntry[], victim: CacheEntry, percent: number = 10): Array<number> | undefined {
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
        const task = new HackTask(ns, agent, victim, undefined, percent);
        if (task.threadDelta < 0) {
            hackTaskWinner = task;
            break;
        } 
        if (task.possibleThreads >= 1) hackTasks.push(task);
    }

    if (hackTaskWinner === undefined) {
        if (hackTasks.length < 1) return undefined;
        hackTaskWinner = hackTasks.sort((a, b) => a.threadDelta - b.threadDelta)[0];
    }

    accumulatedRAM.set(hackTaskWinner.agent.hostname, hackTaskWinner.ram);

    for (const agent of agents) {
        const task = new WeakenTask(ns, agent, victim, accumulatedRAM.get(agent.hostname), hackTaskWinner.secDiff);
        if (task.threadDelta < 0) {
            firstWeakenTaskWinner = task;
            break;
        }
        if (task.possibleThreads >= 1) firstWeakenTasks.push(task);
    }

    if (firstWeakenTaskWinner === undefined) {
        if (firstWeakenTasks.length < 1) return undefined;
        firstWeakenTaskWinner = firstWeakenTasks.sort((a, b) => a.threadDelta - b.threadDelta)[0];
    }

    accumulatedRAM.set(firstWeakenTaskWinner.agent.hostname, (accumulatedRAM.get(firstWeakenTaskWinner.agent.hostname) ?? 0) + firstWeakenTaskWinner.ram);

    for (const agent of agents) {
        const task = new GrowTask(ns, agent, victim, accumulatedRAM.get(agent.hostname), 100 / (100 - percent));
        if (task.threadDelta < 0) {
            growTaskWinner = task;
            break;
        }
        if (task.possibleThreads >= 1) growTasks.push(task);
    }

    if (growTaskWinner === undefined) {
        if (growTasks.length < 1) return undefined;
        growTaskWinner = growTasks.sort((a, b) => a.threadDelta - b.threadDelta)[0];
    }

    accumulatedRAM.set(growTaskWinner.agent.hostname, (accumulatedRAM.get(growTaskWinner.agent.hostname) ?? 0) + growTaskWinner.ram);

    for (const agent of agents) {
        const task = new WeakenTask(ns, agent, victim, accumulatedRAM.get(agent.hostname), growTaskWinner.secDiff);
        if (task.threadDelta < 0) {
            secondWeakenTaskWinner = task;
            break;
        }
        if (task.possibleThreads >= 1) secondWeakenTasks.push(task);
    }
    
    if (secondWeakenTaskWinner === undefined) {
        if (secondWeakenTasks.length < 1) return undefined;
        secondWeakenTaskWinner = secondWeakenTasks.sort((a, b) => a.threadDelta - b.threadDelta)[0];
    }

    const pids = new Array<number>();
    const addedHackTime = (firstWeakenTaskWinner.time - hackTaskWinner.time - 1);
    const addedFirstWeakenTime = 0;
    const addedGrowTime = (firstWeakenTaskWinner.time - growTaskWinner.time) + 1;
    const addedSecondWeakenTime = 2;

    pids.push(ns.exec(SCRIPTS.hack, hackTaskWinner.agent.hostname, hackTaskWinner.actualThreads, victim.hostname, addedHackTime));
    pids.push(ns.exec(SCRIPTS.weaken, firstWeakenTaskWinner.agent.hostname, firstWeakenTaskWinner.actualThreads, victim.hostname, addedFirstWeakenTime));
    pids.push(ns.exec(SCRIPTS.grow, growTaskWinner.agent.hostname, growTaskWinner.actualThreads, victim.hostname, addedGrowTime));
    pids.push(ns.exec(SCRIPTS.weaken, secondWeakenTaskWinner.agent.hostname, secondWeakenTaskWinner.actualThreads, victim.hostname, addedSecondWeakenTime));

    if (pids.includes(0)) {
        for (const pid of pids) {
            if (pid === 0) continue;
            const prog = ns.getRunningScript(pid);
            if (prog !== null) {
                ns.tprint(`ERROR Killing script ${prog.filename} with pid ${pid}`);
            }
            ns.kill(pid);
        }
        return undefined;
    }
    return pids;
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
        if (growTasks.length < 1) return undefined;
        growTasks.sort((a, b) => a.threadDelta - b.threadDelta);
        growTaskWinner = growTasks[0];
    }

    for (const agent of agents) {
        const task = new WeakenTask(ns, agent, victim, undefined, growTaskWinner.secDiff);
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
        if (weakenTasks.length < 1) return undefined;
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

    const idleVictims = GetVictims(ns, servers, true);
    const allVictims = GetVictims(ns, servers, false);

    if (idleVictims.length <= 0) {
        ns.tprintRaw(`[WARN] No idle victims found in server cache!`);
        return undefined;
    }

    if (allVictims.length <= 0) {
        ns.tprintRaw(`[WARN] No victims found in server cache!`);
        return undefined;
    }

    return { agents: agents, idleVictims: idleVictims, allVictims: allVictims };
}

export async function main(ns: NS) {
    while (true) {
        const data: any = TrySetup(ns);
        if (data === undefined) {
            await ns.sleep(5000);
            continue;
        }
        data.idleVictims.sort((a: CacheEntry, b: CacheEntry) => ns.getServerRequiredHackingLevel(a.hostname) - ns.getServerRequiredHackingLevel(b.hostname));
        if (data.idleVictims.length > 10) {
            data.idleVictims.filter((x: CacheEntry) => ns.getServerGrowth(x.hostname) > 30);
        }
        for (const victim of data.idleVictims) {
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
        const best = GetBestDPS(ns, data.allVictims);
        if (best === undefined) continue;;
        let success: number[] | undefined = [];
        while (success !== undefined) {
            success = AssignFullBatch(ns, data.agents, best.victim, 10);
            await ns.sleep(10);
        }
        await ns.sleep(5000);
    }
}