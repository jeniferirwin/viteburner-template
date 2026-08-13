import {NS} from "@ns";
import { GetCache } from "../daemon/cacher";

export type MPSLine = {
    victim: string,
    seconds: number,
    money: number,
    perSec: number
}

export function main(ns: NS) {
    const servers = GetCache(ns);
    if (servers === undefined) return;
    const percent = ns.args[0] as number ?? 0.01;
    const lines = new Array<MPSLine>();
    ns.tprintRaw(ns.sprintf("%20s %15s %15s %15s", "SERVER", "SECONDS", "MONEY", "MPS"))
    for (const server of servers) {
        if (!server.isVictim) continue;
        const hostname = server.hostname;
        const seconds = ns.getWeakenTime(server.hostname) / 1000;
        const money = ns.getServerMaxMoney(server.hostname) * ns.getBitNodeMultipliers().ScriptHackMoney * percent;
        const perSec = money / seconds;
        lines.push({victim: server.hostname, seconds: seconds, money: money, perSec: perSec});
    }
    lines.sort((a, b) => b.perSec - a.perSec);
    for (var line of lines) {
        ns.tprintRaw(ns.sprintf("%20s %15.2fs %15s %15s", line.victim, line.seconds, ns.format.number(line.money), ns.format.number(line.perSec)));
    }
}