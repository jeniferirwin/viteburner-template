import { NS } from "@ns";
import { GetCache, GetAgents, GetVictims } from "../daemon/cacher";

export function main(ns: NS) {
    var cache = GetCache(ns);
    var agents = GetAgents(ns, cache!);
    var victims = GetVictims(ns, cache!, false);
    victims.sort((a, b) => ns.hackAnalyze(b.hostname) - ns.hackAnalyze(a.hostname));
    for (var victim of victims) {
        const portion = ns.hackAnalyze(victim.hostname) * 200;
        const buf = ns.sprintf("%15s %15.4f", victim.hostname, portion);
        ns.tprintRaw(`${buf}`);
    }
}