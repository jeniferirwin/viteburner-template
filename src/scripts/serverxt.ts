import {NS, Server} from "@ns";

export interface ServerXT extends Server {
    crack(ns: NS): boolean;
    getBundle(ns: NS): boolean;
    getParent(ns: NS): string | undefined;
    getChildren(ns: NS): Array<string> | undefined;
}

export class ServerXT implements Server, ServerXT {
    private constructor(ns: NS, hostname: string) {
        Object.assign(this, ns.getServer(hostname));
        if (this.crack(ns)) this.getBundle(ns);
    }

    public static create(ns: NS, hostname: string): ServerXT | undefined {
        if (!ns.serverExists(hostname)) return undefined;
        return new ServerXT(ns, hostname);
    }

    crack(ns: NS): boolean {
        if (this.hasAdminRights) return true;
        if (this.openPortCount === undefined || this.numOpenPortsRequired === undefined) return false;
        ns.ftpcrack(this.hostname);
        ns.brutessh(this.hostname);
        ns.httpworm(this.hostname);
        ns.sqlinject(this.hostname);
        ns.relaysmtp(this.hostname);
        return ns.nuke(this.hostname);
    }
    
    getBundle(ns: NS): boolean {
        return ns.scp(ns.ls("home", "scripts"), this.hostname, "home");
    }

	getChildren(ns: NS): Array<string> | undefined {
		var results = ns.scan(this.hostname);
		return results.slice(1);
	}

    getParent(ns: NS): string | undefined {
		var results = ns.scan(this.hostname);
		return results[0];
    }
}
