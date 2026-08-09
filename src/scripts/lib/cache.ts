import {NS, Server} from "@ns";

export const SCRIPTS = {
    hack: "scripts/task/atk_hack.js",
    weaken: "scripts/task/atk_weaken.js",
    grow: "scripts/task/atk_grow.js"
}

export enum VictimState {
    NONE,
    SECURE,
    BREACHED,
    PREPPED
}

export class CacheEntry {
    hostname: string;
    cpuCores: number;
    backdoorInstalled: boolean;
    purchasedByPlayer: boolean;
    serverGrowth: number;
    numOpenPortsRequired?: number;
    openPortCount?: number;
    isAgent: boolean = false;
    isVictim: boolean = false;

    constructor(ns: NS, server: Server) {
        this.hostname = server.hostname;
        this.cpuCores = server.cpuCores;
        this.backdoorInstalled = server.backdoorInstalled ?? false;
        this.purchasedByPlayer = server.purchasedByPlayer;
        this.serverGrowth = server.serverGrowth ?? 0;
        this.numOpenPortsRequired = server.numOpenPortsRequired ?? 0;
        this.openPortCount = server.openPortCount ?? 0;
        Rootkit(ns, this);
        SetRole(ns, this);
    }
}

export function SetRole(ns: NS, entry: CacheEntry): void {
    if (!ns.hasRootAccess(entry.hostname)) return;
    if (entry.purchasedByPlayer) {
        entry.isAgent = true;
        entry.isVictim = false;
        return;
    }
    if (ns.getServerMaxRam(entry.hostname) > 0) entry.isAgent = true;
    if (ns.getServerMaxMoney(entry.hostname) > 0) entry.isVictim = true;
}

export function ShrinkToRAM(ns: NS, entry: CacheEntry, script: string): number {
    if (!entry.isAgent) return 0;
    if (!ns.fileExists(script, entry.hostname)) return 0;
    const ram = ns.getScriptRam(script, entry.hostname);
    return Math.floor(GetOpenRAM(ns, entry) / ram);
}

export function CrackPorts(ns: NS, entry: CacheEntry): void {
    if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(entry.hostname);
    if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(entry.hostname);
    if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(entry.hostname);
    if (ns.fileExists("RelaySMTP.exe", "home")) ns.relaysmtp(entry.hostname);
    if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(entry.hostname);
}

export function GetSecDiff(ns: NS, entry: CacheEntry): number {
    return ns.getServerSecurityLevel(entry.hostname) - ns.getServerMinSecurityLevel(entry.hostname);
}

export function GetMoneyDiff(ns: NS, entry: CacheEntry): number {
    return ns.getServerMaxMoney(entry.hostname) - ns.getServerMoneyAvailable(entry.hostname);
}

export function GetOpenRAM(ns: NS, entry: CacheEntry): number {
    if (entry.isAgent === false) return 0;
    return ns.getServerMaxRam(entry.hostname) - ns.getServerUsedRam(entry.hostname);
}

export function GetVictimState(ns: NS, entry: CacheEntry): VictimState {
    if (entry.isVictim === false) return VictimState.NONE;
    if (GetSecDiff(ns, entry) > 0) return VictimState.SECURE;
    if (GetMoneyDiff(ns, entry) > 0) return VictimState.BREACHED;
    return VictimState.PREPPED;
}

export function Rootkit(ns: NS, entry: CacheEntry): boolean {
    if (ns.hasRootAccess(entry.hostname)) return true;
    const portsRequired = entry.numOpenPortsRequired ?? 0;
    if (portsRequired < 0 || portsRequired > 5) return false;
    CrackPorts(ns, entry);
    if (IsNukable(entry)) ns.nuke(entry.hostname);
    if (!ns.hasRootAccess(entry.hostname)) return false;
    return true;
}

export function PutBundle(ns: NS, entry: CacheEntry): boolean {
    if (!entry.isAgent) return false;
    if (ns.scp(ns.ls("home", "/scripts/"), entry.hostname, "home")) return true;
    return false;
}

export function IsNukable(entry: CacheEntry): boolean {
    if ((entry.openPortCount ?? 0) < (entry.numOpenPortsRequired ?? Number.POSITIVE_INFINITY)) return false;
    return true;
}