import {NS} from "@ns";
import { CacheDB } from "../daemon/cacher";

export function main(ns: NS) {
    const servers = 
    const percent = ns.args[0] as number ?? 0.01;
    ns.tprintRaw(ns.sprintf("%20s %15s %15s %15s", "SERVER", "SECONDS", "MONEY", "BASEMONEY"))
    for (const server of servers) {
        if (!IsVictim(ns, server)) continue;
        const seconds = ns.getWeakenTime(server) / 1000;
        const moneyBase = (ns.getServerMaxMoney(server) * percent)
        const moneyMod = moneyBase * ns.getBitNodeMultipliers().ScriptHackMoney;
        ns.tprintRaw(ns.sprintf("%20s %15.2fs %15s %15s", server, seconds, ns.format.number(moneyMod), ns.format.number(moneyBase)));
    }
}