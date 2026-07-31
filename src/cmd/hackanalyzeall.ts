import {NS} from "@ns";
import { Victim } from "@/scripts/victim";

export function main(ns: NS) {
    for (const victim of Victim.getAllVictims(ns)) {
        var analyze = ns.hackAnalyze(victim.hostname);
        var analyzeCash = victim.moneyMax! * analyze;
        var buf = ns.sprintf("%20s %-10.5f %-10s / %-10s", victim.hostname, analyze, ns.format.number(analyzeCash), ns.format.number(victim.moneyMax!));
        ns.tprintRaw(buf);
    }
}