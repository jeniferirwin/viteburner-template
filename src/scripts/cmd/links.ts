import {NS} from "@ns";
import { GetAllServerNames } from "@/scripts/lib/server";

export async function main(ns: NS) {
    var servers = GetAllServerNames(ns);
    if (servers === undefined) return;
    for (var server of servers) {
        var obj = ns.getServer(server);
        if ((obj.backdoorInstalled ?? false) || (obj.purchasedByPlayer ?? false)) continue;
        if (server === "w0r1d_d43m0n" || server === "I.I.I.I" || server === "run4theh111z" || server === "The-Cave" || server === "CSEC" || server === "avmnite-02h") {
            for (const host of getChain(ns, server)) {
                ns.singularity.connect(host);
                if (host === server && ns.getServerRequiredHackingLevel(server) <= ns.getPlayer().skills.hacking)
                    await ns.singularity.installBackdoor();
            }
        }
    }
}

export function getParent(ns: NS, server: string): string | undefined {
    if (server === "home") return undefined;
    return ns.scan(server)[0];
}

export function getChain(ns: NS, server: string): Array<string> {
    var chain = [server];
    var parent = getParent(ns, server);
    while (parent !== undefined) {
        chain.push(parent);
        parent = getParent(ns, parent);
    }
    chain.reverse();
    return chain;
}