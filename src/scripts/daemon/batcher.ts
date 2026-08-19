import { NS } from "@ns";
import { GetSecDiff, GetMoneyDiff, CacheEntry, GetOpenRAM, GetAgents, GetCache, GetVictims, GetBestDPS, GetAllOpenRAM, GetAllMaxRAM, RegisterTarget, UnregisterTarget } from "./cacher";
import { SCRIPTS } from "../config";

export const EXCLUSION_TIME = 120;

/**
 * Base class for a planned hack/grow/weaken task: how many threads of `script` an `agent` could
 * run against `victim`, sized against the agent's currently available RAM.
 * @remarks
 * Subclasses (`HackTask`, `GrowTask`, `WeakenTask`) fill in `targetThreads`, `time`, and `secDiff`
 * in their constructors, then call `setThreadInfo` to resolve how many threads actually fit.
 */
export class HGWTask {
    /** Threads needed to fully achieve this task's goal (e.g. hack the desired percent). */
    targetThreads: number = -1;
    /** Threads that fit in the agent's open RAM, ignoring `targetThreads`. */
    possibleThreads: number = -1;
    /** Threads actually assigned: the smaller of `targetThreads` and `possibleThreads`. */
    actualThreads: number = -1;
    /** `targetThreads - possibleThreads`. Positive means the agent can't fully cover the target. */
    threadDelta: number = -1;
    /** Security change this task would cause at `actualThreads`. */
    secDiff: number = -1;
    /** RAM (in GB) required to run `actualThreads` of `script`. */
    ram: number = -1;
    /** Time (in ms) this task takes to complete. */
    time: number = -1;

    /**
     * @param script - Path of the HGW script this task will run.
     * @param agent - Cache entry for the server the task would run on.
     * @param victim - Cache entry for the server the task targets.
     * @param reserved - RAM (in GB) on `agent` to leave unused, e.g. for other tasks already assigned.
     * @param HGWMod - Task-specific modifier (meaning depends on subclass).
     */
    constructor(public script: string, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {}

    /**
     * Resolve `possibleThreads`, `threadDelta`, `actualThreads`, and `ram` from the agent's
     * currently open RAM and `reserved`.
     * @remarks
     * Must be called after `targetThreads` has been set, typically at the end of a subclass constructor.
     * @param ns - Netscript namespace.
     */
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

/**
 * A planned grow task. `HGWMod` is the money multiplier the victim needs to reach max money;
 * if not given (default -1), it is computed from the victim's current money.
 */
export class GrowTask extends HGWTask {
    /**
     * @param ns - Netscript namespace.
     * @param agent - Cache entry for the server the task would run on.
     * @param victim - Cache entry for the server the task targets.
     * @param reserved - RAM (in GB) on `agent` to leave unused.
     * @param HGWMod - Money multiplier required to reach max money, or -1 to compute it from the victim's current money.
     */
    constructor(ns: NS, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {
        super(SCRIPTS.grow, agent, victim, reserved, HGWMod);
        if (HGWMod === -1) HGWMod = ns.getServerMaxMoney(victim.hostname) / ns.getServerMoneyAvailable(victim.hostname);
        this.time = ns.getGrowTime(victim.hostname);
        this.targetThreads = Math.ceil(ns.growthAnalyze(victim.hostname, HGWMod, agent.cpuCores));
        this.setThreadInfo(ns);
        this.secDiff = ns.growthAnalyzeSecurity(this.actualThreads, undefined, agent.cpuCores);
    }
}

/**
 * A planned weaken task. `HGWMod` is the amount of security to remove; if not explicitly passed
 * as `undefined`, it is computed from the victim's current security level.
 */
export class WeakenTask extends HGWTask {
    /**
     * @param ns - Netscript namespace.
     * @param agent - Cache entry for the server the task would run on.
     * @param victim - Cache entry for the server the task targets.
     * @param reserved - RAM (in GB) on `agent` to leave unused.
     * @param HGWMod - Amount of security to remove, or `undefined` to compute it from the victim's current security level above minimum.
     */
    constructor(ns: NS, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {
        super(SCRIPTS.weaken, agent, victim, reserved, HGWMod);
        if (HGWMod === undefined) HGWMod = ns.getServerSecurityLevel(victim.hostname) - ns.getServerMinSecurityLevel(victim.hostname);
        this.time = ns.getWeakenTime(victim.hostname);
        this.targetThreads = Math.ceil(HGWMod / (agent.weakenMult ?? 0));
        this.setThreadInfo(ns);
        this.secDiff = ns.weakenAnalyze(this.actualThreads, agent.cpuCores);
    }
}

/**
 * A planned hack task. `HGWMod` is the percentage of the victim's max money to steal.
 */
export class HackTask extends HGWTask {
    /**
     * @param ns - Netscript namespace.
     * @param agent - Cache entry for the server the task would run on.
     * @param victim - Cache entry for the server the task targets.
     * @param reserved - RAM (in GB) on `agent` to leave unused.
     * @param HGWMod - Percentage (0-100) of the victim's max money to steal.
     */
    constructor(ns: NS, public agent: CacheEntry, public victim: CacheEntry, public reserved: number = 0, public HGWMod: number = -1) {
        super(SCRIPTS.hack, agent, victim, reserved, HGWMod);
        this.targetThreads = Math.ceil((HGWMod / 100) / ns.hackAnalyze(victim.hostname));
        this.time = ns.getHackTime(victim.hostname);
        this.setThreadInfo(ns);
        this.secDiff = ns.hackAnalyzeSecurity(this.actualThreads);
    }
}

/**
 * Launch a full four-part hack/weaken/grow/weaken batch against a victim.
 * @remarks
 * For each stage, picks the agent (sorted by most CPU cores first) whose task first fully covers
 * the required threads; if none can, falls back to the agent with the smallest thread shortfall.
 * RAM already committed to earlier stages on the same agent is tracked in `accumulatedRAM` and
 * reserved when sizing later stages. Tasks are launched with delays so the hack, first weaken,
 * grow, and second weaken land in that order. If any `ns.exec` call fails (returns pid 0), every
 * successfully launched task in the batch is killed and the batch is aborted.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to draw agents from.
 * @param victim - Cache entry for the server to batch against.
 * @param percent - Percentage of the victim's max money the hack stage should steal. Defaults to 10.
 * @returns PIDs of the four launched scripts, or undefined if the batch could not be assigned or launched.
 */
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

/**
 * Launch a grow+weaken pair against a victim, used to prep it toward max money and min security.
 * @remarks
 * Picks the best-fit grow agent first (most CPU cores first, full coverage preferred, else
 * smallest thread shortfall), then picks a weaken agent the same way. If the only viable weaken
 * agent is the same server the grow task is running on, it is skipped unless its RAM can cover
 * both tasks together. The grow task is launched early enough to finish just before the weaken
 * task. If either `ns.exec` call fails, any successfully launched task is killed and the job is
 * aborted.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to draw agents from.
 * @param victim - Cache entry for the server to prep.
 * @returns PIDs of the two launched scripts, or undefined if the job could not be assigned or launched.
 */
export function AssignGWJob(ns: NS, cache: CacheEntry[], victim: CacheEntry): Array<number> | undefined {
    var agents = GetAgents(ns, cache);
    if (agents.length === 0) return undefined;
    agents.sort((a, b) => ((b.cpuCores) - (a.cpuCores)));
    const growTasks = new Array<GrowTask>();
    const weakenTasks = new Array<WeakenTask>();
    let growTaskWinner;
    let weakenTaskWinner;

    for (const agent of agents) {
        const task = new GrowTask(ns, agent, victim, undefined, 1.1);
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

/**
 * Spread a weaken job for `diff` security across as many agents as it takes to close the gap.
 * @remarks
 * Used as a fallback when no single agent can supply enough weaken threads on its own. Agents are
 * tried from lowest to highest `weakenMult`, each contributing as many threads as its open RAM
 * allows, until the security diff is fully covered or agents run out. If any `ns.exec` call fails,
 * every successfully launched task is killed and the job is aborted.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to draw agents from.
 * @param victim - Cache entry for the server to weaken.
 * @param diff - Amount of security to remove.
 * @returns True if the job was launched successfully, false otherwise.
 */
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

/**
 * Assign a single agent to weaken a victim by `diff` security, falling back to a distributed job.
 * @remarks
 * Tries agents from lowest to highest `weakenMult`, i.e. prefers agents that need the most
 * threads to close the gap, so as to leave higher-`weakenMult` agents free for other tasks. Picks
 * the first agent whose open RAM can cover the required thread count. If no single agent can
 * cover it, falls back to `DistributeWeakenJob`.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to draw agents from.
 * @param victim - Cache entry for the server to weaken.
 * @param diff - Amount of security to remove.
 * @returns True if the job was launched successfully (directly or via the distributed fallback), false otherwise.
 */
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

/**
 * Gather the state the main loop needs for one iteration: available agents, all victims, idle
 * victims, and the current best-DPS target.
 * @remarks
 * Requires the cacher daemon to be running and its cache to be populated; logs a warning and
 * returns undefined if either precondition fails, or if there are no usable agents or victims.
 * Registers the best-DPS victim (if any) as a target as a side effect.
 * @param ns - Netscript namespace.
 * @returns An object with `agents`, `idleVictims`, `allVictims`, and `best`, or undefined if setup preconditions aren't met.
 */
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
        return undefined;
    }

    const allVictims = GetVictims(ns, servers, false, EXCLUSION_TIME);
    const best = GetBestDPS(ns, allVictims);
    if (best !== undefined) RegisterTarget(ns, best.victim.hostname);
    const idleVictims = GetVictims(ns, servers, true, EXCLUSION_TIME);

    if (allVictims.length <= 0) {
        if (best !== undefined) UnregisterTarget(ns, best.victim.hostname);
        return undefined;
    }

    return { agents: agents, idleVictims: idleVictims, allVictims: allVictims, best: best };
}

/**
 * Entry point. Repeatedly batches the best-DPS victim while it remains the best target and RAM
 * usage stays under 75% of total capacity, then assigns prep (weaken/grow) work to other idle
 * victims that are close enough to being batchable.
 * @remarks
 * Idle victims are sorted by required hacking level (easiest first) and, once there are more than
 * 10 of them, filtered down to those with server growth above 30. For each, a weaken job is
 * assigned if security is above minimum and weaken time is under an hour, otherwise a grow+weaken
 * job is assigned if money is below maximum and grow time is under an hour. Sleeps 5 seconds
 * between iterations when there is nothing to do.
 * @param ns - Netscript namespace.
 */
export async function main(ns: NS) {
    while (true) {
        const data: any = TrySetup(ns);
        if (data === undefined) {
            await ns.sleep(5000);
            continue;
        }
        if (data.best !== undefined) {
            let success: number[] | undefined = [];
            var usedRAM = GetAllMaxRAM(ns, data.agents) - GetAllOpenRAM(ns, data.agents);
            while (success !== undefined && data.best.victim.hostname === (GetBestDPS(ns, data.allVictims)?.victim.hostname ?? "none") && usedRAM < GetAllMaxRAM(ns, data.agents) * .75) {
                success = AssignFullBatch(ns, data.agents, data.best.victim, 10);
                usedRAM = GetAllMaxRAM(ns, data.agents) - GetAllOpenRAM(ns, data.agents);
                await ns.sleep(10);
            }
        }
        data.idleVictims.sort((a: CacheEntry, b: CacheEntry) => ns.getServerRequiredHackingLevel(a.hostname) - ns.getServerRequiredHackingLevel(b.hostname));
        if (data.idleVictims.length > 10) {
            data.idleVictims.filter((x: CacheEntry) => ns.getServerGrowth(x.hostname) > 30);
        }
        for (const victim of data.idleVictims) {
            const diff = GetSecDiff(ns, victim);
            if (diff > 0 && ns.getWeakenTime(victim.hostname)) {
                AssignBestWeakenAgent(ns, data.agents, victim, diff);
                continue;
            }
            const moneyDiff = GetMoneyDiff(ns, victim);
            if (moneyDiff > 0 && ns.getGrowTime(victim.hostname)) {
                AssignGWJob(ns, data.agents, victim);
                continue;
            }
        }
        await ns.sleep(5000);
    }
}
