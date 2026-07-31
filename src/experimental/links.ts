import {NS} from "@ns";
import { ServerXT, getAllServerXT } from "@/scripts/serverxt";

export function main(ns: NS) {
    var servers = getAllServerXT(ns);
    if (servers === undefined) return;
    for (var server of servers) {
        if ((server.backdoorInstalled ?? false) || (server.purchasedByPlayer ?? false)) continue;
        ns.tprintRaw(getChain(ns, server.hostname));
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