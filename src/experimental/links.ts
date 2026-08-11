import {NS} from "@ns";
import { GetAllServerNames } from "@/scripts/lib/server";

export function main(ns: NS) {
    var servers = GetAllServerNames(ns);
    if (servers === undefined) return;
    for (var server of servers) {
        var obj = ns.getServer(server);
        if ((obj.backdoorInstalled ?? false) || (obj.purchasedByPlayer ?? false)) continue;
        if (server === "w0r1d_d43m0n" || server === "I.I.I.I" || server === "run4theh111z" || server === "The-Cave" || server === "CSEC" || server === "avmnite-02h")
            ns.tprintRaw(getChain(ns, server));
    }
}

export function getParent(ns: NS, server: string): string | undefined {
    if (server === "home") return undefined;
    return ns.scan(server)[0];
}

export function getChain(ns: NS, server: string): string {
    var chain = [server];
    var parent = getParent(ns, server);
    while (parent !== undefined) {
        chain.push(parent);
        parent = getParent(ns, parent);
    }
    chain.reverse();
    var cutoff = 0;
    for (var x = 0; x < chain.length; x++) {
        var link = ns.getServer(chain[x]);
        if (!link.purchasedByPlayer && !link.backdoorInstalled) {
            cutoff = x;
            break;
        }
    }
    var buf = "";
    for (var i = cutoff - 1; i < chain.length - 1; i++) {
        buf = buf.concat(chain[i], " ; connect ");
    }
    buf = buf.concat(chain[chain.length - 1]);
    return buf;
}