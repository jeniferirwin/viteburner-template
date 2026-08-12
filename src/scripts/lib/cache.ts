import {NS, Server} from "@ns";

export const WeakenTable: Array<number> = [0, ...Array.from({length: 199}, (_, i) => 0.05 * (1 + i / 16))];

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
    weakenMult?: number;

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

/**
 * Open every port on a server for which the player has the matching cracking program.
 * @remarks
 * Runs BruteSSH.exe, FTPCrack.exe, HTTPWorm.exe, RelaySMTP.exe, and SQLInject.exe against the target
 * server for each program that exists on home, regardless of whether the port is already open.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 */
export function CrackPorts(ns: NS, entry: CacheEntry): void {
    if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(entry.hostname);
    if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(entry.hostname);
    if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(entry.hostname);
    if (ns.fileExists("RelaySMTP.exe", "home")) ns.relaysmtp(entry.hostname);
    if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(entry.hostname);
}

/**
 * Get the factor a victim server's money must be multiplied by to reach its maximum.
 * @remarks
 * Returns the ratio of the server's maximum money to its currently available money, suitable for
 * passing to ns.growthAnalyze. A fully grown server reports 1, and a server drained to no money
 * reports Infinity.
 * @param ns - Netscript namespace.
 * @param victim - Cache entry for the target server.
 * @returns Growth multiplier needed to restore the server to maximum money, or 0 if the server is not a victim.
 */
export function GetGrowthRequiredMultiplier(ns: NS, victim: CacheEntry): number {
	if (!victim.isVictim) return 0;
	return ns.getServerMaxMoney(victim.hostname) / ns.getServerMoneyAvailable(victim.hostname);
}

/**
 * Get the amount of money missing from a victim server.
 * @remarks
 * Returns the difference between the server's maximum money and its currently available money.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @returns Money missing from the server, or 0 if the server is not a victim.
 */
export function GetMoneyDiff(ns: NS, entry: CacheEntry): number {
    if (!entry.isVictim) return 0;
    return ns.getServerMaxMoney(entry.hostname) - ns.getServerMoneyAvailable(entry.hostname);
}

/**
 * Get the amount of unused RAM available on an agent server.
 * @remarks
 * Servers that are not marked as agents are treated as having no usable RAM.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @returns Free RAM (in GB) on the server, or 0 if the server is not an agent.
 */
export function GetOpenRAM(ns: NS, entry: CacheEntry, reserveIfHome: boolean = false): number {
    if (entry.isAgent === false) return 0;
    var used = ns.getServerUsedRam(entry.hostname);
    if (reserveIfHome && entry.hostname === "home")
        used += 32;
    return ns.getServerMaxRam(entry.hostname) - used;
}

/**
 * Get how far a victim server's security level is above its minimum.
 * @remarks
 * Returns the difference between the server's current security level and its minimum
 * security level. Servers that are not marked as victims report -1.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @returns Security level above the minimum, or -1 if the server is not a victim.
 */
export function GetSecDiff(ns: NS, entry: CacheEntry): number {
    if (!entry.isVictim) return -1;
    return ns.getServerSecurityLevel(entry.hostname) - ns.getServerMinSecurityLevel(entry.hostname);
}

/**
 * Get the current preparation state of a victim server.
 * @remarks
 * A server is SECURE while its security level is above minimum, BREACHED once security is at
 * minimum but money is below maximum, and PREPPED once both security and money are at their
 * optimal values.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @returns The victim's current state, or VictimState.NONE if the server is not a victim.
 */
export function GetVictimState(ns: NS, entry: CacheEntry): VictimState {
    if (entry.isVictim === false) return VictimState.NONE;
    if (GetSecDiff(ns, entry) > 0) return VictimState.SECURE;
    if (GetMoneyDiff(ns, entry) > 0) return VictimState.BREACHED;
    return VictimState.PREPPED;
}

/**
 * Check whether a server has enough open ports to be nuked.
 * @param entry - Cache entry for the target server.
 * @returns True if the server's open port count meets its required port count.
 */
export function IsNukable(entry: CacheEntry): boolean {
    if ((entry.openPortCount ?? 0) < (entry.numOpenPortsRequired ?? Number.POSITIVE_INFINITY)) return false;
    return true;
}

/**
 * Copy the local scripts bundle to an agent server.
 * @remarks
 * Copies every file under /scripts/ on home to the target server.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @returns True if the files were copied successfully, or false if the server is not an agent or the copy failed.
 */
export function PutBundle(ns: NS, entry: CacheEntry): boolean {
    if (!entry.isAgent) return false;
    if (ns.scp(ns.ls("home", "/scripts/"), entry.hostname, "home")) return true;
    return false;
}

/**
 * Gain root access to a server, cracking ports and running NUKE.exe as needed.
 * @remarks
 * Does nothing if root access is already held. Otherwise cracks any ports the player has programs
 * for and nukes the server once enough ports are open.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @returns True if the server has root access after this call, false otherwise.
 */
export function Rootkit(ns: NS, entry: CacheEntry): boolean {
    if (ns.hasRootAccess(entry.hostname)) return true;
    const portsRequired = entry.numOpenPortsRequired ?? 0;
    if (portsRequired < 0 || portsRequired > 5) return false;
    CrackPorts(ns, entry);
    if (IsNukable(entry)) ns.nuke(entry.hostname);
    if (!ns.hasRootAccess(entry.hostname)) return false;
    return true;
}

/**
 * Determine whether a server should be treated as an agent, a victim, or both.
 * @remarks
 * Does nothing if the player lacks root access to the server. Purchased servers are always
 * treated as agents and never as victims. Otherwise a server is an agent if it has RAM to run
 * scripts, and a victim if it has money to hack.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry to update.
 */
export function SetRole(ns: NS, entry: CacheEntry): void {
    if (!ns.hasRootAccess(entry.hostname)) return;
    if (entry.purchasedByPlayer) {
        entry.isAgent = true;
        entry.isVictim = false;
    }
    if (ns.getServerMaxRam(entry.hostname) > 0) entry.isAgent = true;
    if (ns.getServerMaxMoney(entry.hostname) > 0) entry.isVictim = true;
    if (entry.isAgent) entry.weakenMult = WeakenTable[entry.cpuCores];
}

/**
 * Get how many threads of a script fit in a server's open RAM.
 * @remarks
 * Returns 0 if the server is not an agent or the script is not present on the server.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @param script - Path of the script to size against.
 * @returns Number of threads the server's open RAM can support for the script.
 */
export function ShrinkToRAM(ns: NS, entry: CacheEntry, script: string): number {
    if (!entry.isAgent) return 0;
    if (!ns.fileExists(script, entry.hostname)) return 0;
    const ram = ns.getScriptRam(script, entry.hostname);
    return Math.floor(GetOpenRAM(ns, entry) / ram);
}
