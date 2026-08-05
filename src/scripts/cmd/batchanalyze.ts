import {NS} from "@ns";
import { SCRIPTS } from "../lib/const";
import { IsAgent, IsVictim } from "../lib/server";
import { CACHE_PORT } from "../lib/const";

export class BatchTask {
    agent: string = "";
    script: string = "";
    scriptRAM: number = 0;
    baseTime: number = 0;
    extraMsec: number = 0;
    cores: number = 1;
    threads: number = 1;
    totalRAM: number = 0;
    secDiff: number = 0;

    protected constructor(script: string) {
        this.script = script;
    }

    static create(ns: NS, target: string, script: string): BatchTask | undefined {
        if (!IsVictim(ns, target)) return undefined;
        if (!ns.fileExists(script, "home")) return undefined;
        const task = new BatchTask(script);
        task.scriptRAM = ns.getScriptRam(script, "home");
        return task;
    }

    setAgent(ns: NS, agent: string): boolean {
        if (!IsAgent(ns, agent)) return false;
        var cores = ns.peek(CACHE_PORT) as string | Map<string, number>;
        if (typeof(cores) === "string") return false;
        var entry = cores.get(agent);
        if (entry === undefined) return false;
        this.agent = agent;
        this.cores = entry;
        return true;
    }
}

export function CreateHackTask(ns: NS, victim: string) {
    return BatchTask.create(ns, victim, SCRIPTS.hack);
}

export function CreateGrowTask(ns: NS, victim: string) {
    return BatchTask.create(ns, victim, SCRIPTS.grow);
}

export function CreateWeakenTask(ns: NS, victim: string) {
    return BatchTask.create(ns, victim, SCRIPTS.weaken);
}

export class Batch {
    growScriptRam = 0;
    weakenScriptRam = 0;
    hackScriptRam = 0;
    target: string = "";
    maxMoney: number = 0;
    moneyAvailable: number = 0;
    percent: number = 0;
    moneyTaken: number = 0;
    hack!: BatchTask;
    weakenA!: BatchTask;
    grow!: BatchTask;
    weakenB!: BatchTask;
    
    protected constructor() {}

    static create(ns: NS, target: string, percent: number): Batch | undefined {
        if (!ns.serverExists(target)) return undefined;
        const hackTask = CreateHackTask(ns, target);
        if (hackTask === undefined) return;
        ns.tprintRaw("ksjd");
        const weakenATask = CreateWeakenTask(ns, target);
        if (weakenATask === undefined) return;
        const growTask = CreateGrowTask(ns, target);
        if (growTask === undefined) return;
        const weakenBTask = CreateWeakenTask(ns, target);
        if (weakenBTask === undefined) return;
        const batch = new Batch();
        batch.target = target;
        batch.hack = hackTask;
        batch.weakenA = weakenATask;
        batch.grow = growTask;
        batch.weakenB = weakenBTask;
        batch.setImmutable(ns, target);
        batch.updateMutable(ns, percent);
        return batch;
    }

    setImmutable(ns: NS, target: string) {
        this.maxMoney = ns.getServerMaxMoney(target);

        this.weakenA.baseTime = ns.getWeakenTime(this.target);
        this.weakenB.baseTime = this.weakenA.baseTime;
        this.hack.baseTime = ns.getHackTime(this.target);
        this.grow.baseTime = ns.getGrowTime(this.target);

        this.hack.extraMsec = this.weakenA.baseTime - this.hack.baseTime + 10;
        this.weakenA.extraMsec = this.weakenA.baseTime - this.weakenA.baseTime + 15;
        this.grow.extraMsec = this.weakenA.baseTime - this.grow.baseTime + 20;
        this.weakenB.extraMsec = this.weakenA.baseTime - this.weakenB.baseTime + 25;
    }

    updateMutable(ns: NS, percent: number) {
        this.moneyAvailable = ns.getServerMoneyAvailable(this.target);
        this.percent = percent / 100;
        this.moneyTaken = this.percent * this.moneyAvailable;
        this.hack.threads = Math.ceil(this.percent / ns.hackAnalyze(this.target));
        this.hack.secDiff = ns.hackAnalyzeSecurity(this.hack.threads);
        this.weakenA.threads = Math.ceil(this.hack.secDiff / 0.05);
        this.grow.threads = Math.ceil(ns.growthAnalyze(this.target, this.moneyTaken, this.grow.cores));
        this.grow.secDiff = ns.growthAnalyzeSecurity(this.grow.threads, "", this.grow.cores);
        this.weakenB.threads = Math.ceil(this.grow.secDiff / 0.05);
        this.weakenA.secDiff = ns.weakenAnalyze(this.weakenA.threads, this.weakenA.cores);
        this.weakenB.secDiff = ns.weakenAnalyze(this.weakenB.threads, this.weakenB.cores);
        this.hack.totalRAM = this.hack.threads * this.hack.scriptRAM;
        this.grow.totalRAM = this.grow.threads * this.grow.scriptRAM;
        this.weakenA.totalRAM = this.weakenA.threads * this.weakenA.scriptRAM;
        this.weakenB.totalRAM = this.weakenB.threads * this.weakenB.scriptRAM;
        this.printStats(ns);
    }

    printStats(ns: NS) {
        const lines = [];
        const cols = 15;
        const dec = 3;
        const headerfmt = `%${cols}s %${cols}s %${cols}s %${cols}s %${cols}s`;
        const rowfmt = `%${cols}s %${cols}.${dec}f %${cols}.${dec}f %${cols}.${dec}f %${cols}.${dec}f`;
        lines.push(`TARGET     ${this.target}`);
        lines.push(`TAKEN      $${ns.format.number(this.moneyTaken)} (${this.percent * 100}%)`);
        lines.push(`SECDIFF    ${ns.getServerSecurityLevel(this.target) - ns.getServerMinSecurityLevel(this.target)}`);
        lines.push(`MONEY      ${ns.getServerMoneyAvailable(this.target)} (${(ns.getServerMoneyAvailable(this.target) / ns.getServerMaxMoney(this.target)) * 100})`);
        lines.push(` `);
        lines.push(ns.sprintf(headerfmt, "", this.hack.agent, this.weakenA.agent, this.grow.agent, this.weakenB.agent));
        lines.push(ns.sprintf(headerfmt, "", "HACK", "WEAKENA", "GROW", "WEAKENB"));
        lines.push(ns.sprintf(rowfmt, "TIMES", this.hack.baseTime, this.weakenA.baseTime, this.grow.baseTime, this.weakenB.baseTime));
        lines.push(ns.sprintf(rowfmt, "+MSEC", this.hack.extraMsec, this.weakenA.extraMsec, this.grow.extraMsec, this.weakenB.extraMsec));
        lines.push(ns.sprintf(rowfmt, "TO-TIME", this.hack.baseTime + this.hack.extraMsec, this.weakenA.baseTime + this.weakenA.extraMsec, this.grow.baseTime + this.grow.extraMsec, this.weakenB.baseTime + this.weakenB.extraMsec));
        lines.push(ns.sprintf(rowfmt, "CORES", 1, this.weakenA.cores, this.grow.cores, this.weakenB.cores));
        lines.push(ns.sprintf(rowfmt, "THREADS", this.hack.threads, this.weakenA.threads, this.grow.threads, this.weakenB.threads));
        lines.push(ns.sprintf(rowfmt, "RAM", this.hack.totalRAM, this.weakenA.totalRAM, this.grow.totalRAM, this.weakenB.totalRAM));
        lines.push(ns.sprintf(rowfmt, "SECURITY", this.hack.secDiff, this.weakenA.secDiff, this.grow.secDiff, this.weakenB.secDiff));
        for (const line of lines) {
            ns.tprintRaw(line);
        }
    }
}

export function handleArgs(ns: NS): Map<string, any> | undefined {
    if (ns.args.length === 0) return undefined;
    const args = new Map<string, any>();
    const target = ns.args[0];
    const percent = ns.args[1];
    const weakenACores = ns.args[2];
    const growCores = ns.args[3];
    const weakenBCores = ns.args[4];
    if (typeof(target) !== "string" || !ns.serverExists(target)) {
        ns.tprintRaw(`No such server: ${target}`);
        return undefined;
    }
    if (ns.getServerMaxMoney(target) <= 0) {
        ns.tprintRaw(`Server ${target} has no money!`);
        return undefined;
    }
    args.set("target", target);
    if (percent !== undefined && typeof(percent) === "number" && percent > 0 && percent <= 100) {
        args.set("percent", percent);
    }
    if (weakenACores !== undefined && typeof(weakenACores) === "number" && weakenACores > 0) {
        args.set("weakenACores", weakenACores);
    }
    if (growCores !== undefined && typeof(growCores) === "number" && growCores > 0) {
        args.set("growCores", growCores);
    }
    if (weakenBCores !== undefined && typeof(weakenBCores) === "number" && weakenBCores > 0) {
        args.set("weakenBCores", weakenBCores);
    }
    return args;
}

export function main(ns: NS) {
    const args = handleArgs(ns);
    var batch = Batch.create(ns, "n00dles", 10);
}