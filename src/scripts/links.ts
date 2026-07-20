import {NS} from "@ns";
import { getAllServers, getParentServer } from "./libserver";

export function main(ns: NS) {
    var servers = getAllServers(ns);
    for (var server of servers) {
        if (server[1].backdoorInstalled || server[1].purchasedByPlayer) {
            continue;
        }
        ns.tprint(getChain(ns, server[0]));
    }
}

export function getChain(ns: NS, hostname: string = "home") {
    var chain = [hostname];
    var parent = getParentServer(ns, hostname);
    while (parent !== undefined) {
        chain.push(parent);
        parent = getParentServer(ns, parent);
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
        buf = buf.concat(chain[i], " -> ");
    }
    buf = buf.concat(chain[chain.length - 1]);
    return buf;
}