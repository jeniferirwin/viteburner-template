import { NS, Server } from "@ns";
import { GetAllServerNames } from "../lib/server";
import { CACHE_PORT, TARGET_PORT } from "../config";

/**
 * Preparation state of a victim server, from least to most ready to be batched.
 */
export enum VictimState {
    /** The server is not a victim. */
    NONE,
    /** Security level is above minimum. */
    SECURE,
    /** Security is at minimum but money is below maximum. */
    BREACHED,
    /** Security and money are both at their optimal values. */
    PREPPED,
}

/**
 * Weaken multiplier per CPU core, indexed by `cpuCores`.
 * @remarks
 * Entry 0 is unused (no server has 0 cores). Values increase linearly from 0.05 per core beyond the first.
 */
export const WeakenTable: number[] = [0, ...Array.from({ length: 199 }, (_, i) => 0.05 * (1 + i / 16))];

/**
 * Snapshot of a server's static and derived properties, used to decide whether it should be
 * treated as an agent (RAM provider), a victim (hacking target), or both.
 */
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

    /**
     * Build a cache entry from a server snapshot, gaining root access and assigning its role as a
     * side effect.
     * @param ns - Netscript namespace.
     * @param server - Server snapshot to build the entry from.
     */
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
 * Projected return from hacking a victim server for a given percentage of its max money per cycle.
 * @remarks
 * A "cycle" is taken to be one weaken time, since weaken is the slowest of the three HGW operations
 * and therefore bounds how often the victim can be hacked again.
 */
export class DPSEntry {
    /** Fraction of the victim's money stolen by a single hack thread. */
    part: number;
    /** Hack threads required to steal `percent`% of the victim's max money. */
    threads: number;
    /** Money stolen per cycle at `threads` hack threads. */
    stolen: number;
    /** Money stolen per second, using the victim's weaken time as the cycle length. */
    dps: number;

    /**
     * @param ns - Netscript namespace.
     * @param victim - Cache entry for the target server.
     * @param percent - Target percentage of the victim's max money to steal per cycle.
     */
    constructor(ns: NS, public victim: CacheEntry, public percent: number) {
        this.part = ns.hackAnalyze(victim.hostname);
        this.threads = Math.ceil((percent / 100) / this.part);
        this.stolen = ns.getServerMaxMoney(victim.hostname) * (this.part * this.threads);
        this.dps = this.stolen / (ns.getWeakenTime(victim.hostname) / 1000);
    }
}

/**
 * Read the server cache from the cache port.
 * @param ns - Netscript namespace.
 * @returns The cached entries, or undefined if the port has never been written to.
 */
export function GetCache(ns: NS): CacheEntry[] | undefined {
    const entries = ns.peek(CACHE_PORT);
    if (typeof entries === "string") return undefined;
    return entries;
}

/**
 * Find a cache entry by hostname.
 * @param ns - Netscript namespace.
 * @param hostname - Hostname to look up.
 * @returns The matching cache entry, or undefined if the cache is unavailable or has no match.
 */
export function GetCacheEntry(ns: NS, hostname: string): CacheEntry | undefined {
    const entries = GetCache(ns);
    if (entries === undefined) return undefined;
    return entries.find((entry) => entry.hostname === hostname);
}

/**
 * Rebuild the server cache from scratch and write it to the cache port.
 * @remarks
 * Scans every known server, builds a CacheEntry for each, discards entries that are neither
 * agents nor victims, copies the scripts bundle to surviving agents, and rewrites the cache port.
 * Logs a warning if the port write fails.
 * @param ns - Netscript namespace.
 */
export function RefreshCache(ns: NS): void {
    const entries: CacheEntry[] = [];
    ns.clearPort(CACHE_PORT);
    const servers = GetAllServerNames(ns);
    for (const server of servers) {
        const entry = new CacheEntry(ns, ns.getServer(server));
        if (!entry.isAgent && !entry.isVictim) continue;
        PutBundle(ns, entry);
        entries.push(entry);
    }
    if (!ns.tryWritePort(CACHE_PORT, entries)) {
        ns.tprintRaw(`[WARN] CacheDB failed to update server list!`);
    }
}

/**
 * Read the set of currently targeted victim hostnames from the target port.
 * @remarks
 * Returns an empty set if the port has never been written to.
 * @param ns - Netscript namespace.
 * @returns Set of hostnames currently registered as targets.
 */
export function GetTargets(ns: NS): Set<string> {
    const db = ns.peek(TARGET_PORT) as Set<string> | string;
    if (typeof db === "string") {
        return new Set<string>();
    }
    return db;
}

/**
 * Check whether a hostname is currently registered as a target.
 * @param ns - Netscript namespace.
 * @param target - Hostname to check.
 * @returns True if the hostname is registered as a target.
 */
export function IsTarget(ns: NS, target: string): boolean {
    const db = GetTargets(ns);
    if (db.size <= 0) return false;
    if (db.has(target)) return true;
    return false;
}

/**
 * Add a hostname to the set of registered targets.
 * @remarks
 * Clears and rewrites the target port. Logs an error and returns false if the write fails.
 * @param ns - Netscript namespace.
 * @param target - Hostname to register.
 * @returns True if the target port was updated successfully.
 */
export function RegisterTarget(ns: NS, target: string): boolean {
    const db = GetTargets(ns);
    ns.clearPort(TARGET_PORT);
    db.add(target);
    if (ns.tryWritePort(TARGET_PORT, db)) return true;
    ns.tprintRaw(`[ERROR] PID database failed to update properly when registering ${target}.`);
    return false;
}

/**
 * Remove a hostname from the set of registered targets.
 * @remarks
 * Clears and rewrites the target port. Returns true without writing if the set was already empty.
 * @param ns - Netscript namespace.
 * @param target - Hostname to unregister.
 * @returns True if the target port was updated successfully, or was already empty.
 */
export function UnregisterTarget(ns: NS, target: string): boolean {
    const db = GetTargets(ns);
    if (db.size <= 0) return true;
    if (db.has(target)) db.delete(target);
    ns.clearPort(TARGET_PORT);
    if (ns.tryWritePort(TARGET_PORT, db)) return true;
    return false;
}

/**
 * Get the cache entries that are agents with enough open RAM to run scripts.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to filter.
 * @returns Cache entries marked as agents with at least 1.7GB of open RAM.
 */
export function GetAgents(ns: NS, cache: CacheEntry[]): CacheEntry[] {
    return cache.filter((x) => x.isAgent && GetOpenRAM(ns, x, true) >= 1.7);
}

/**
 * Print and return the set of distinct CPU core counts among agent servers.
 * @remarks
 * Diagnostic helper: prints each distinct core count to the terminal via `ns.tprintRaw` as a
 * side effect, in addition to returning the set.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to inspect.
 * @returns Set of distinct `cpuCores` values found among agents.
 */
export function GetCoreTable(ns: NS, cache: CacheEntry[]): Set<number> {
    var agents = GetAgents(ns, cache);
    agents.sort((a, b) => b.cpuCores - a.cpuCores);
    const cpuSet = new Set<number>();
    for (const agent of agents) {
        cpuSet.add(agent.cpuCores);
    }
    for (var item of cpuSet) {
        ns.tprintRaw(`${item}`);
    }
    return cpuSet;
}

/**
 * Get the cache entries that are victims, optionally restricted to those without an active target.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to filter.
 * @param onlyIdle - If true, exclude victims that are currently registered as targets.
 * @param exclusionTime - Exclude victims that would take longer than this time (in seconds) to weaken.
 * @returns Cache entries marked as victims.
 */
export function GetVictims(ns: NS, cache: CacheEntry[], onlyIdle: boolean, exclusionTime: number = Number.POSITIVE_INFINITY): CacheEntry[] {
    var filtered = cache.filter((x) => x.isVictim);
    if (onlyIdle) filtered = cache.filter((x) => !GetTargets(ns).has(x.hostname));
    if (exclusionTime < Number.POSITIVE_INFINITY) filtered = cache.filter((x) => ns.getWeakenTime(x.hostname) <= (exclusionTime * 1000));
    return filtered;
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
 * Find the prepped victim with the best projected money-per-second.
 * @remarks
 * Restricts the search to victims currently in VictimState.PREPPED, then evaluates each at hack
 * percentages from 1% to 20% and returns the single best-scoring combination.
 * @param ns - Netscript namespace.
 * @param cache - Cache entries to search (typically already filtered to victims).
 * @returns The best-scoring DPSEntry, or undefined if there are no prepped victims.
 */
export function GetBestDPS(ns: NS, cache: CacheEntry[]): DPSEntry | undefined {
    const victims = GetVictims(ns, cache, false).filter((x) => GetVictimState(ns, x) === VictimState.PREPPED);
    const entries = new Array<DPSEntry>();
    for (var i = 1; i <= 20; i++) {
        for (const victim of victims) {
            entries.push(new DPSEntry(ns, victim, i));
        }
    }
    const best = entries.sort((a, b) => (b.dps - a.dps))[0];
    return best;
}

/**
 * Get the amount of unused RAM available on an agent server.
 * @remarks
 * Servers that are not marked as agents are treated as having no usable RAM.
 * @param ns - Netscript namespace.
 * @param entry - Cache entry for the target server.
 * @param reserveIfHome - If true, reserve 32GB of RAM when the entry is the home server.
 * @returns Free RAM (in GB) on the server, or 0 if the server is not an agent.
 */
export function GetOpenRAM(ns: NS, entry: CacheEntry, reserveIfHome: boolean = false): number {
    if (entry.isAgent === false) return 0;
    let used = ns.getServerUsedRam(entry.hostname);
    if (reserveIfHome && entry.hostname === "home") used += 32;
    return ns.getServerMaxRam(entry.hostname) - used;
}

/**
 * Get the total unused RAM across a set of agent servers.
 * @remarks
 * Sums `GetOpenRAM` with `reserveIfHome` enabled for every entry, regardless of whether each
 * entry is actually marked as an agent.
 * @param ns - Netscript namespace.
 * @param agents - Cache entries to sum.
 * @returns Total free RAM (in GB) across all given servers.
 */
export function GetAllOpenRAM(ns: NS, agents: CacheEntry[]): number {
    var total = 0;
    for (var agent of agents) {
        total += GetOpenRAM(ns, agent, true);
    }
    return total;
}

/**
 * Get the total maximum RAM across a set of agent servers.
 * @param ns - Netscript namespace.
 * @param agents - Cache entries to sum.
 * @returns Total max RAM (in GB) across all given servers.
 */
export function GetAllMaxRAM(ns: NS, agents: CacheEntry[]): number {
    var total = 0;
    for (var agent of agents) {
        total += ns.getServerMaxRam(agent.hostname);
    }
    return total;
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
export function GetMaxThreads(ns: NS, entry: CacheEntry, script: string): number {
    if (!entry.isAgent) return 0;
    if (!ns.fileExists(script, entry.hostname)) return 0;
    const ram = ns.getScriptRam(script, entry.hostname);
    return Math.floor(GetOpenRAM(ns, entry) / ram);
}

/**
 * Get the total RAM required to run a number of threads of a script, as sized on home.
 * @remarks
 * Script RAM cost is always looked up on the home server, regardless of which server the
 * threads would actually run on.
 * @param ns - Netscript namespace.
 * @param script - Path of the script to size.
 * @param threads - Number of threads to size for.
 * @returns Total RAM (in GB) required, or -1 if the script does not exist on home.
 */
export function TotalRAM(ns: NS, script: string, threads: number): number {
    if (!ns.fileExists(script, "home")) return -1;
    return threads * ns.getScriptRam(script, "home");
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
 * Check whether a server has enough open ports to be nuked.
 * @param entry - Cache entry for the target server.
 * @returns True if the server's open port count meets its required port count.
 */
export function IsNukable(entry: CacheEntry): boolean {
    if ((entry.openPortCount ?? 0) < (entry.numOpenPortsRequired ?? Number.POSITIVE_INFINITY)) return false;
    return true;
}

/**
 * Gain root access to a server, cracking ports and running NUKE.exe as needed.
 * @remarks
 * Does nothing if root access is already held. Also does nothing if the server reports an
 * invalid required-port count (negative, or greater than 5). Otherwise cracks any ports the
 * player has programs for and nukes the server once enough ports are open.
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
    if (
        ns.getServerMaxMoney(entry.hostname) > 0 &&
        ns.getServerRequiredHackingLevel(entry.hostname) <= ns.getPlayer().skills.hacking
    ) {
        entry.isVictim = true;
    }
    if (entry.isAgent) entry.weakenMult = WeakenTable[entry.cpuCores];
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
 * Entry point. Continuously refreshes the server cache every 10 seconds.
 * @remarks
 * Exits immediately if another instance of this script is already running on home, so only one
 * copy ever loops.
 * @param ns - Netscript namespace.
 */
export async function main(ns: NS): Promise<void> {
    const ps = ns.ps("home");
    for (var process of ps) {
        if (process.filename === ns.self().filename && process.pid !== ns.pid) return;
    }
    while (true) {
        RefreshCache(ns);
        await ns.sleep(10000);
    }
}
