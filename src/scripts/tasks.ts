import {ScriptArg, NS} from "@ns";
import { Globals } from "./globals";
import { getServerXT, ServerXT } from "./serverxt";
import { get, Server } from "http";
import { getAllServers } from "./libserver";

export class TaskAssignment {
    pid?: number;

    protected constructor(
        public args?: ScriptArg[]
    ) {};

    taskLaunched() {
        return (this.pid ?? -1) > -1;
    }

    static create(args?: ScriptArg[]): TaskAssignment | undefined {
        return new TaskAssignment(args);
    }
}

export class AttackAssignment extends TaskAssignment {
    public agent?: string;
    public threads?: number;
    public time?: number;
    protected constructor(
        public ns: NS,
        public victimName: string
    ) {
        super();
    }

    static createAttack(ns: NS, victim: string): AttackAssignment | undefined {
        if (!AttackAssignment.validateVictim(ns, victim)) return undefined;
        return new AttackAssignment(ns, victim);
    }

    getVictimXT(ns: NS): ServerXT | undefined {
        return getServerXT(ns, this.victimName);
    }

    static validateVictim(ns: NS, victim: string): boolean {
        if (!ns.serverExists(victim) || ns.getServerMaxMoney(victim) === 0 || ns.getServerMinSecurityLevel(victim) < 0) return false;
        var skill = ns.getPlayer().skills.hacking;
        var required = ns.getServerRequiredHackingLevel(victim);
        if (skill >= required) return true;
        return false;
    }

    public setAgent(ns: NS, agentName: string): boolean {
        if (!ns.serverExists(agentName)) return false;
        var server = getServerXT(ns, agentName);
        if (!server?.isAgent()) return false;
        this.agent = agentName;
        return true;
    }
}

export class ZeroSecDiff extends AttackAssignment {
    public secDiff?: number;

    constructor(
        public ns: NS,
        public victimName: string,
    ) {
        super(ns, victimName);
    }

    static createAttack(ns: NS, victim: string): ZeroSecDiff | undefined {
        if (!ZeroSecDiff.validateVictim(ns, victim)) return undefined;
        return new ZeroSecDiff(ns, victim);
    }

    public calculateThreads(ns: NS, attacker: ServerXT): number {
        var diff = this.getVictimXT(ns)?.getSecurityDiff(ns) ?? 0;
        this.threads = Math.ceil(diff / 0.05);
        while (ns.weakenAnalyze((this.threads ?? 0), attacker.cpuCores ?? 1) > diff) {
            this.threads--;
        }
        this.threads++;
        return this.threads;
    }

    public calculateTotalRAM(ns: NS, attacker: ServerXT): number {
        return attacker.getWeakenRAM(ns) * (this.threads ?? 1);
    }

    public locateAgent(ns: NS): boolean {
        var target = this.getVictimXT(ns);
        var servers = getAllServers(ns);
        var threads = Number.POSITIVE_INFINITY;
        for (var [hostname, server] of servers) {
            if (!server.isAgent() || server === undefined) continue;
            var agentThreads = this.calculateThreads(ns, server);
        }
        return true;
    }
}

export function main(ns: NS) {
    let threads;
    let serverName;
    for (var [hostname, server] of servers) {
        var newcalc = test.calculateThreads(ns, server, target);
        if (newcalc <= threads && scriptRam * threads < (server.openRAM() ?? 0)) {
            threads = newcalc;
            serverName = hostname;
            ns.tprintRaw(`setting servername to ${hostname}`);
            ram = threads * scriptRam;
        }
    }
    ns.tprintRaw(`Winner is ${serverName} with ${threads} threads and ${ram} ram requirement`);
}