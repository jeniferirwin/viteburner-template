import {NS} from "@ns";
import { CacheEntry, GetCache, GetCacheEntry, GetAgents } from "../daemon/cacher";
import { SCRIPTS } from "../config";

export type MPSData = {
    victim: string,
    seconds: number,
    money: number,
    perSec: number
}

export function CalculateBatch(ns: NS, cache: CacheEntry[], victim: CacheEntry, percent: number) {
    var agents = GetAgents(ns, cache);
    if (agents.length < 1) return;
    agents.sort((a, b) => (b.weakenMult ?? 0) - (a.weakenMult ?? 0));
    const hackScriptRAM = ns.getScriptRam(SCRIPTS.hack, "home");
    const growScriptRAM = ns.getScriptRam(SCRIPTS.grow, "home");
    const weakenScriptRAM = ns.getScriptRam(SCRIPTS.weaken, "home");

    const available = ns.getServerMoneyAvailable(victim.hostname);
    const amount = available * (percent / 100);

    const hackThreads = Math.ceil(ns.hackAnalyzeThreads(victim.hostname, amount));
    const hackRAM = hackScriptRAM * hackThreads;
    const hackedPercent = (hackThreads * ns.hackAnalyze(victim.hostname));
    const hackedAmount = hackedPercent * amount;
    const hackSec = ns.hackAnalyzeSecurity(hackThreads);

    const hackWeakenThreadsLow = Math.ceil(hackSec / (agents[0].weakenMult ?? 0));
    const hackWeakenThreadsHigh = Math.ceil(hackSec / (agents.slice(-1)[0].weakenMult ?? 0));
    const hackWeakenRAMLow = weakenScriptRAM * hackWeakenThreadsLow;
    const hackWeakenRAMHigh = weakenScriptRAM * hackWeakenThreadsHigh;

    const growMult = available / (available - amount);
    const growThreadsLow = Math.ceil(ns.growthAnalyze(victim.hostname, growMult, agents[0].cpuCores));
    const growThreadsHigh = Math.ceil(ns.growthAnalyze(victim.hostname, growMult, agents.slice(-1)[0].cpuCores));
    const growRAMLow = growScriptRAM * growThreadsLow;
    const growRAMHigh = growScriptRAM * growThreadsHigh;
    const growSecLow = ns.growthAnalyzeSecurity(growThreadsLow, "", agents[0].cpuCores);
    const growSecHigh = ns.growthAnalyzeSecurity(growThreadsHigh, "", agents.slice(-1)[0].cpuCores);


    const growLowWeakenThreadsLow = Math.ceil(growSecLow / (agents[0].weakenMult ?? 0));
    const growHighWeakenThreadsLow = Math.ceil(growSecHigh / (agents[0].weakenMult ?? 0));
    const growLowWeakenThreadsHigh = Math.ceil(growSecLow / (agents.splice(-1)[0].weakenMult ?? 0));
    const growHighWeakenThreadsHigh = Math.ceil(growSecHigh / (agents.splice(-1)[0].weakenMult ?? 0));
    const growLowWeakenRAMLow = weakenScriptRAM * growLowWeakenThreadsLow;
    const growHighWeakenRAMLow = weakenScriptRAM * growHighWeakenThreadsLow;
    const growLowWeakenRAMHigh = weakenScriptRAM * growLowWeakenThreadsHigh;
    const growHighWeakenRAMHigh = weakenScriptRAM * growHighWeakenThreadsHigh;

    var hackParams = ["THREADS", "RAM", "PERCENT", "AMOUNT", "SECURITY"];
    var hackWeakenParams = ["LTHREADS", "HTHREADS", "LRAM", "HRAM"];
    var growParams = ["LTHREADS", "LRAM", "HTHREADS", "HRAM", "MULT", "LSEC", "HSEC"];
    var growWeakenParams = ["LLTHREADS", "LLRAM", "LHTHREADS", "LHRAM", "HLTHREADS", "HLRAM", "HHTHREADS", "HHRAM"];
    ns.tprintRaw("HACK");
    ns.tprintRaw(ns.vsprintf("%15s %15s %15s %15s %15s", hackParams));
    ns.tprintRaw(ns.sprintf("%15d %15.3f %15.3f %15.3f %15.3f", hackThreads, hackRAM, hackedPercent, hackedAmount, hackSec));
    ns.tprintRaw("");
    ns.tprintRaw("HACK-WEAKEN");
    ns.tprintRaw(ns.vsprintf("%15s %15s %15s %15s", hackWeakenParams));
    ns.tprintRaw(ns.sprintf("%15.3f %15.3f %15.3f %15.3f", hackWeakenThreadsLow, hackWeakenThreadsHigh, hackWeakenRAMLow, hackWeakenRAMHigh));
    ns.tprintRaw("");
    ns.tprintRaw("GROW");
    ns.tprintRaw(ns.vsprintf("%15s %15s %15s %15s %15s %15s %15s", growParams));
    ns.tprintRaw(ns.sprintf("%15.3f %15.3f %15.3f %15.3f %15.3f %15.3f %15.3f", growThreadsLow, growRAMLow, growThreadsHigh, growRAMHigh, growMult, growSecLow, growSecHigh));
    ns.tprintRaw("");
    ns.tprintRaw("GROW-WEAKEN");
    ns.tprintRaw(ns.vsprintf("%15s %15s %15s %15s %15s %15s %15s %15s", growWeakenParams));
    ns.tprintRaw(ns.sprintf("%15.3f %15.3f %15.3f %15.3f %15.3f %15.3f %15.3f %15.3f", growLowWeakenThreadsLow, growLowWeakenRAMLow, growLowWeakenThreadsHigh, growLowWeakenRAMHigh, growHighWeakenThreadsLow, growHighWeakenRAMLow, growHighWeakenThreadsHigh, growHighWeakenRAMHigh));
}

export function main(ns: NS) {
    const servers = GetCache(ns);
    if (servers === undefined) return;
    CalculateBatch(ns, servers, GetCacheEntry(ns, ns.args[0] as string)!, ns.args[1] as number);
    return;
    const percent = ns.args[0] as number ?? 0.01;
    const lines = new Array<MPSData>();
    ns.tprintRaw(ns.sprintf("%20s %15s %15s %15s", "SERVER", "SECONDS", "MONEY", "MPS"))
    for (const server of servers!) {
        if (!server.isVictim) continue;
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