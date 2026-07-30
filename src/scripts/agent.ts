import {NS} from "@ns";
import { getServerXT, ServerXT } from "./serverxt";
import { Victim } from "./victim";
import { Globals } from "./globals";
import { getAllServerNames } from "./libserver";

export interface Agent extends ServerXT {
    isAgent(ns: NS, hostname: string): boolean;
}

export class Agent implements Agent, ServerXT {
    private constructor(ns: NS, hostname: string) {
        var server = getServerXT(ns, hostname);
        server?.getBundle(ns);
        Object.assign(this, server);
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

    public static getAllAgents(ns: NS): Set<Agent> {
        const agents = new Set<Agent>();
        const servers = getAllServerNames(ns);
        for (const server of servers) {
            const agent = Agent.create(ns, server);
            if (Agent.isAgent(ns,server) && agent !== undefined) agents.add(agent);
        }
        return agents;
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
            var threads = Math.floor(agent.openRAM() / chunk);
            if (threads < 1) return 1;
        }
        return threads;
    }

    public getGrowthThreads(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        var threads = Math.ceil(ns.growthAnalyze(victim.hostname, victim.getMoneyMult(), this.cpuCores));
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
        if (threads < 1) threads = 1;
        if (allowThreadTruncate === true) {
            var truncated = Agent.truncateThreads(ns, threads, Globals.scriptWeaken, this);
            return truncated;
        }
        return threads;
    }

    public doWeaken(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        const threads = this.getWeakenThreads(ns, victim, allowThreadTruncate);
        if (threads >= 1) return ns.exec(Globals.scriptWeaken, this.hostname, threads, victim.hostname);
        return 0;
    }

    public doGrow(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        const threads = this.getGrowthThreads(ns, victim, allowThreadTruncate);
        if (threads >= 1) return ns.exec(Globals.scriptGrow, this.hostname, threads, victim.hostname);
        return 0;
    }

    public doHack(ns: NS, victim: Victim, allowThreadTruncate: boolean): number {
        const threads = this.getHackThreads(ns, victim, allowThreadTruncate);
        if (threads >= 1) return ns.exec(Globals.scriptHack, this.hostname, threads, victim.hostname);
        return 0;
    }
}