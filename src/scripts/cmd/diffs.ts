import {NS} from "@ns";
import { GetCache, GetVictims } from "../daemon/cacher";

export function main(ns: NS) {
    const cache = GetCache(ns);
    if (cache === undefined) return;
    const victims = GetVictims(cache);   
    const headers = ["HOST", "BASE", "MIN", "CURRENT", "DIFF", "$AVAIL", "$MAX", "PCT"];
    ns.tprintRaw(ns.vsprintf("%15s %15s %15s %15s %15s %15s %15s %15s", headers));
    for (const victim of victims) {
        const values = [victim.hostname, ns.getServerBaseSecurityLevel(victim.hostname), ns.getServerMinSecurityLevel(victim.hostname), ns.getServerSecurityLevel(victim.hostname), ns.getServerSecurityLevel(victim.hostname) - ns.getServerMinSecurityLevel(victim.hostname), ns.getServerMoneyAvailable(victim.hostname), ns.getServerMaxMoney(victim.hostname), (ns.getServerMoneyAvailable(victim.hostname) / ns.getServerMaxMoney(victim.hostname)) * 100];
        ns.tprintRaw(ns.vsprintf("%15s %15.2f %15.2f %15.2f %15.2f %15.2f %15.2f %15.2f", values));
    }
}