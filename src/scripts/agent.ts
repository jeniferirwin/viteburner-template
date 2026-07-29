import {NS} from "@ns";
import { getServerXT, ServerXT } from "./serverxt";
import { Victim } from "./victim";
import { Globals } from "./globals";

export interface Agent extends ServerXT {
    isAgent(ns: NS, hostname: string): boolean;
}

export class Agent implements Agent {
    private constructor(ns: NS, hostname: string) {
        Object.assign(this, getServerXT(ns, hostname))
        this.getBundle(ns);
    }

    public static create(ns: NS, hostname: string): Agent | undefined {
        if (!Agent.isAgent(ns, hostname)) return undefined;
        return new Agent(ns, hostname);
    }

    public static isAgent(ns: NS, hostname: string): boolean {
        if (!ns.serverExists(hostname)) return false;
        var server = getServerXT(ns, hostname);
        if (!server?.hasAdminRights) return false;
        if (server.ramUsed == undefined || (server.maxRam ?? 0) <= 0) return false;
        return true;
    }

    public openRAM() {
        return this.maxRam - this.ramUsed;
    }

    public totalRAMRequired(ns: NS, script: string, threads: number): number | undefined {
        if (!ns.fileExists(script, this.hostname)) return undefined;
        if (threads < 1) return undefined;
        return threads * ns.getScriptRam(script, this.hostname);
    }

    public static truncateThreads(ns: NS, threads: number, script: string, agent: Agent): number {
        var required = agent.totalRAMRequired(ns, script, threads) ?? Number.POSITIVE_INFINITY;
        if (agent.openRAM() < required) {
            var chunk = ns.getScriptRam(script, agent.hostname);
            return Math.floor(agent.openRAM() / chunk);
        }
        return threads;
    }

    public getGrowthThreads(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        var threads = ns.growthAnalyze(victim.hostname, victim.getMoneyMult(), this.cpuCores);
        if (allowThreadTruncate === true) return Agent.truncateThreads(ns, threads, Globals.scriptGrow, this);
        return threads;
    }

    public getGrowthSecDiff(ns: NS, threads: number): number {
        return ns.growthAnalyzeSecurity(threads, this.hostname, this.cpuCores);
    }

    public getHackSecDiff(ns: NS, threads: number, victim: Victim): number {
        return ns.hackAnalyzeSecurity(threads, victim.hostname);
    }

    public getHackThreads(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        var threads = ns.hackAnalyzeThreads(this.hostname, victim.getMoneyMult());
        if (allowThreadTruncate === true) return Agent.truncateThreads(ns, threads, Globals.scriptHack, this);
        return threads;
    }

    public getWeakenThreads(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        var diff = victim.getSecurityDiff();
        var threads = Math.ceil(diff / 0.05);
        if (allowThreadTruncate === true) return Agent.truncateThreads(ns, threads, Globals.scriptWeaken, this);
        return threads;
    }
}