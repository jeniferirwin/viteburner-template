import {NS, ProcessInfo} from "@ns";
import { IsAgent, IsVictim, GetAllProcesses } from "./server";

/**
 * Runs every port-opening program the player currently owns against a server.
 *
 * @remarks
 * Checks for each cracking program (BruteSSH.exe, FTPCrack.exe, HTTPWorm.exe, RelaySMTP.exe,
 * SQLInject.exe) on "home" via {@link NS.fileExists}, and only calls the corresponding
 * {@link NS.brutessh}/{@link NS.ftpcrack}/{@link NS.httpworm}/{@link NS.relaysmtp}/
 * {@link NS.sqlinject} function for programs that are owned. Programs not yet owned are
 * skipped rather than throwing.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to open ports on.
 */
export function CrackPorts(ns: NS, hostname: string): void {
  if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(hostname);
  if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(hostname);
  if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(hostname);
  if (ns.fileExists("RelaySMTP.exe", "home")) ns.relaysmtp(hostname);
  if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(hostname);
}

/**
 * Determines whether a victim server currently has an attack script running against it.
 *
 * @remarks
 * Scans the processes running across all provided `servers` and checks whether any
 * script whose filename includes "scripts/atk" is running with `hostname` as an argument.
 * Returns false immediately if `hostname` is not a valid {@link IsVictim | victim}.
 *
 * @param ns - Netscript API object.
 * @param servers - Set of hostnames whose running processes will be inspected.
 * @param hostname - Hostname of the potential victim server.
 * @returns True if an attack script (grow/hack/weaken) targeting `hostname` is currently running.
 */
export function IsBeingAttacked(ns: NS, servers: Set<string>, hostname: string): boolean {
    if (!IsVictim(ns, hostname)) return false;
    for (const [server, info] of GetAllProcesses(ns, servers)) {
        const filtered: ProcessInfo[] = info.filter((proc) => proc.args.indexOf(hostname) >= 0);
        for (const entry of filtered) {
            if (entry.filename.includes("scripts/atk") && entry.args.includes(hostname)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Determines whether a server has enough open ports for {@link NS.nuke} to succeed.
 *
 * @remarks
 * Compares the number of ports already opened on the server against the number
 * required, using {@link NS.getServer}. Returns false if the server does not exist.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to check.
 * @returns True if the server exists and has at least as many open ports as required.
 */
export function IsNukable(ns: NS, hostname: string): boolean {
  if (!ns.serverExists(hostname)) return false;
  const server = ns.getServer(hostname);
  if ((server.openPortCount ?? 0) < (server.numOpenPortsRequired ?? Number.POSITIVE_INFINITY)) return false;
  return true;
}

/**
 * Determines whether a victim server is fully "prepped" for efficient hacking.
 *
 * @remarks
 * A server is considered prepped when its money is at maximum, its security level is at
 * minimum, and no attack scripts are currently running against it. Returns false immediately
 * if `hostname` is not a valid {@link IsVictim | victim}.
 *
 * @param ns - Netscript API object.
 * @param servers - Set of hostnames used to check for ongoing attacks via {@link IsBeingAttacked}.
 * @param hostname - Hostname of the server to check.
 * @returns True if the server's money is maxed, security is minimized, and it is not being attacked.
 */
export function IsPrepped(ns: NS, servers: Set<string>, hostname: string): boolean {
  if (!IsVictim(ns, hostname)) return false;
  if (ns.getServerMaxMoney(hostname) > ns.getServerMoneyAvailable(hostname)) return false;
  if (ns.getServerMinSecurityLevel(hostname) < ns.getServerSecurityLevel(hostname)) return false;
  if (IsBeingAttacked(ns, servers, hostname)) return false;
  return true;
}

/**
 * Copies every script in the "scripts" folder to a server so it can run attack scripts.
 *
 * @remarks
 * Returns false immediately if `hostname` is not a valid {@link IsAgent | agent}. Otherwise
 * lists every file under "scripts" on "home" and copies them to `hostname` via {@link NS.scp}.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to copy scripts to.
 * @returns True if the server is a valid agent and the scripts were copied successfully.
 */
export function PutBundle(ns: NS, hostname: string): boolean {
  if (!IsAgent(ns, hostname)) return false;
  if (ns.scp(ns.ls("home", "scripts/atk_"), hostname, "home")) return true;
  return false;
}

/**
 * Attempts to gain root access on a server, cracking its ports and nuking it if needed,
 * then seeds it with the attack script bundle.
 *
 * @remarks
 * Returns false if the server does not exist. Returns true immediately if root access is
 * already present. Bails out if the server requires more ports than the player could ever
 * open (more than 5). Otherwise runs {@link CrackPorts} to open every port, then calls
 * {@link NS.nuke} if {@link IsNukable} reports the server is ready. Once rooted, copies the
 * attack scripts to the server via {@link PutBundle}.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to root.
 * @returns True if root access was obtained (or already present) on the server.
 */
export function Rootkit(ns: NS, hostname: string): boolean {
  if (!ns.serverExists(hostname)) return false;
  if (ns.hasRootAccess(hostname)) return true;
  if (ns.getServerNumPortsRequired(hostname) < 0 || ns.getServerNumPortsRequired(hostname) > 5) return false;
  CrackPorts(ns, hostname);
  if (IsNukable(ns, hostname)) ns.nuke(hostname);
  if (!ns.hasRootAccess(hostname)) return false;
  if (IsAgent(ns, hostname)) PutBundle(ns, hostname);
  return true;
}