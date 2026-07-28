import {ScriptArg, NS} from "@ns";
import { getServerXT, ServerXT } from "./serverxt";
import { getAllServers } from "./libserver";
import { Globals } from "./globals";

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

    getAgentXT(ns: NS): ServerXT | undefined {
        return getServerXT(ns, this.agent ?? "");
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
    public script: string = Globals.scriptWeaken;

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

    public locateAgent(ns: NS, allowThreadTrim: boolean = false): boolean {
        var servers = getAllServers(ns);
        var threads = Number.POSITIVE_INFINITY;
        this.agent = undefined;
        for (var [hostname, server] of servers) {
            if (!server.isAgent() || server === undefined) continue;
            var scriptRAM = server.getWeakenRAM(ns)
            var agentThreads = this.calculateThreads(ns, server);
            var totalRAM = scriptRAM * agentThreads;
            if (agentThreads <= threads && (totalRAM <= (server.openRAM() ?? 0) || allowThreadTrim === true)) {
                if (allowThreadTrim === true && totalRAM >= (server.openRAM() ?? 0)) {
                    this.threads = Math.floor((server.openRAM() ?? 0) / scriptRAM);
                } else {
                    this.threads = agentThreads;
                }
                this.setAgent(ns, hostname);
            }
        }
        if (this.agent === undefined) return false;
        return true;
    }
}

export function main(ns: NS) {
    if (ns.args.length < 1) return;
    var attack = ZeroSecDiff.createAttack(ns, ns.args[0] as string);
    if (attack === undefined) return;
    attack.locateAgent(ns, true);
    if (attack.agent === undefined) {
        ns.tprintRaw("Attack failed");
        return;
    }
    attack.pid = ns.exec(attack.script, attack.agent, attack.threads, attack.victimName);
    ns.tprintRaw(`[${attack.pid}] Weaken launched: ${attack.agent} vs. ${attack.victimName} with ${attack.threads}`);
}