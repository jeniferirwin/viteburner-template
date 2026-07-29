import {NS} from "@ns";
import { ServerXT, getServerXT } from "./serverxt";
import { getAllServerNames } from "./libserver";

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
        var server = ns.getServer(hostname);
        if (server.purchasedByPlayer) return false;
        if (!server.hasAdminRights) return false;
        if (server.minDifficulty === undefined || server.hackDifficulty === undefined) return false;
        if (server.openPortCount === undefined || server.numOpenPortsRequired === undefined) return false;
        if (server.requiredHackingSkill ?? Number.POSITIVE_INFINITY > ns.getPlayer().skills.hacking) return false;
        if (server.moneyMax === undefined || server.moneyAvailable === undefined) return false;
        return true;
    }

    public static getAllVictims(ns: NS): Set<string> {
        const victims = new Set<string>();
        const servers = getAllServerNames(ns);
        for (const server of servers) {
            if (Victim.isVictim(ns, server)) victims.add(server);
        }
        return victims;
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
