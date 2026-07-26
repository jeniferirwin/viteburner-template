import {NS, Server} from "@ns";
import { AttackAssignment } from "./tasks";

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
        if ((this.maxRam ?? 0) > 0 && (this.ramUsed ?? 0) > 0) {
            return this.maxRam - this.ramUsed; 
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
        ns.tprintRaw(`Cracking ${this.hostname}`);
        return ns.nuke(this.hostname);
    }
    
    putBundle(ns: NS): boolean {
        const bundle = ns.ls("home", "scripts");
        return ns.scp(bundle, this.hostname, "home");
    }

    getParent(ns: NS): string | undefined {

        return undefined;
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
