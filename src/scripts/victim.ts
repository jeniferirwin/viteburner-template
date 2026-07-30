import {NS, ScriptArg} from "@ns";
import { ServerXT, getServerXT } from "./serverxt";
import { getAllServerNames } from "./libserver";
import { Agent } from "./agent";
import { Globals } from "./globals";


export interface Victim extends ServerXT {
    getSecurityDiff(): number;
    getMoneyMult(): number;
}

export class Victim implements Victim, ServerXT {
    private constructor(ns: NS, hostname: string) {
        Object.assign(this, getServerXT(ns, hostname));
    }

    public static create(ns: NS, hostname: string): Victim | undefined {
        if (!Victim.isVictim(ns, hostname)) return undefined;
        return new Victim(ns, hostname);
    }

    public static isVictim(ns: NS, hostname: string): boolean {
        if (!ns.serverExists(hostname)) return false;
        var server = getServerXT(ns, hostname);
        if (server === undefined) return false;
        if (server.purchasedByPlayer) return false;
        if (!server.hasAdminRights) return false;
        if (server.minDifficulty === undefined || server.hackDifficulty === undefined) return false;
        if (server.openPortCount === undefined || server.numOpenPortsRequired === undefined) return false;
        if ((server.requiredHackingSkill ?? Number.POSITIVE_INFINITY) > ns.getPlayer().skills.hacking) return false;
        if (server.moneyMax === undefined || server.moneyAvailable === undefined) return false;
        return true;
    }

    public static getAllVictims(ns: NS): Set<Victim> {
        const victims = new Set<Victim>();
        const servers = getAllServerNames(ns);
        for (const server of servers) {
            const victim = Victim.create(ns, server);
            if (Victim.isVictim(ns, server) && victim !== undefined) victims.add(victim);
        }
        return victims;
    }

    public static isBeingAttacked(ns: NS, victim: Victim): boolean {
        const agents = Agent.getAllAgents(ns);
        const arg: ScriptArg = victim.hostname;
        for (const agent of agents) {
            for (const script of [Globals.scriptGrow, Globals.scriptHack, Globals.scriptWeaken]) {
                if (ns.getRunningScript(script, agent.hostname, arg)) {
                    return true;
                }
            }
        }
        return false;
    }

    public getSecurityDiff(): number {
        return this.hackDifficulty! - this.minDifficulty!;
    }

    public getMoneyMult(): number {
        return this.moneyMax! / this.moneyAvailable!;
    }
    public isPrepped(): boolean {
        if (this.getSecurityDiff() <= 0 && this.getMoneyMult() <= 1) return true;
        return false;
    }
}
