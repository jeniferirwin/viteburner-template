import {NS, Server} from "@ns";
import { Globals } from "./globals";
import { TaskAssignment } from "./tasks";

export interface ServerXT extends Server {
    hasCash(): boolean;
    openRAM(): number;
    tryCrack(ns: NS): boolean;
    putBundle(ns: NS): boolean;
}

export class ServerXT implements Server, ServerXT {
    hasCash(): boolean {
        if (this.moneyMax ?? 0 > 0) return true;
        return false;
    }

    openRAM(): number {
        if ((this.maxRam ?? 0) > 0 && (this.ramUsed ?? -1) > -1) {
            return (this.maxRam - this.ramUsed); 
        }
        return 0;
    }

    crack(ns: NS): boolean {
        if (this.openPortCount === undefined || this.numOpenPortsRequired === undefined) return false;
        if (this.openPortCount === 5) return true;
        ns.ftpcrack(this.hostname);
        ns.brutessh(this.hostname);
        ns.httpworm(this.hostname);
        ns.sqlinject(this.hostname);
        ns.relaysmtp(this.hostname);
        return ns.nuke(this.hostname);
    }
    
    putBundle(ns: NS): boolean {
        const bundle = ns.ls("home", "scripts");
        return ns.scp(bundle, this.hostname, "home");
    }

    getParent(ns: NS): string | undefined {
		var results = ns.scan(this.hostname);
		return results[0];
    }
	
	getChildren(ns: NS): Array<string> | undefined {
		var results = ns.scan(this.hostname);
		return results.slice(1);
	}

    getMoneyMult(ns: NS): number {
        if (this.purchasedByPlayer ||
            (this.moneyMax ?? 0) === 0 ||
            (this.moneyAvailable ?? 0) === 0 ||
            (this.baseDifficulty ?? -1) === -1 ||
            (this.hackDifficulty ?? -1) === -1 ||
            (this.minDifficulty ?? -1)) return 0;
        return ns.getServerMaxMoney(this.hostname) / ns.getServerMoneyAvailable(this.hostname);
    }

    getSecurityDiff(ns: NS): number {
        if (this.purchasedByPlayer) return -1;
        if (this.hackDifficulty === undefined || this.minDifficulty === undefined) return -1;
        return this.hackDifficulty - this.minDifficulty;
    }

    isAgent(): boolean {
        if (this.hasAdminRights && (this.maxRam ?? 0) > 0) return true;
        return false;
    }

    getWeakenRAM(ns: NS): number {
        return ns.getScriptRam(Globals.scriptWeaken, this.hostname);
    }

    getGrowRAM(ns: NS): number {
        return ns.getScriptRam(Globals.scriptGrow, this.hostname);
    }

    getHackRAM(ns: NS): number {
        return ns.getScriptRam(Globals.scriptHack, this.hostname);
    }

    hasEnoughRAM(ns: NS, task: TaskAssignment): boolean {

    }

    refresh(ns: NS): ServerXT {
        var server = getServerXT(ns, this.hostname) ?? this;
        return server;
    }
}

/**
 * Get a ServerXT (Server Extended) with additional methods ready to go.
 * Automatically attempts to crack the server, and puts the script bundle
 * on it if successful.
 */
export function getServerXT(ns: NS, hostname: string): ServerXT | undefined {
    if (!ns.serverExists(hostname)) return undefined;
    var raw = ns.getServer(hostname);
    var xt = Object.assign(new ServerXT(), raw);
    if (xt.crack(ns)) xt.putBundle(ns);
    return xt;
}
