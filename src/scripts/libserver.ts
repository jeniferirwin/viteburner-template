import { NS, ProcessInfo } from "@ns";

/**
 * Runs every available port-opening program against a server.
 *
 * @remarks
 * Unconditionally calls {@link NS.brutessh}, {@link NS.ftpcrack}, {@link NS.httpworm},
 * {@link NS.relaysmtp}, and {@link NS.sqlinject} on `hostname`. Programs the player does not
 * yet own will throw, so this should only be called once the required programs are available.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to open ports on.
 */
export function CrackPorts(ns: NS, hostname: string): void {
  ns.brutessh(hostname);
  ns.ftpcrack(hostname);
  ns.httpworm(hostname);
  ns.relaysmtp(hostname);
  ns.sqlinject(hostname);
}

/**
 * Returns a map of every running process on the given servers.
 *
 * @remarks
 * Calls {@link NS.ps} on each server in `servers` and collects the results.
 * Servers with no running processes are omitted from the returned map.
 *
 * @param ns - Netscript API object.
 * @param servers - Set of hostnames to query.
 * @returns A map from hostname to the list of processes running on that server.
 */
export function GetAllProcesses(ns: NS, servers: Set<string>): Map<string, ProcessInfo[]> {
    const processes = new Map<string, ProcessInfo[]>();
    for (const server of servers) {
        const ps = ns.ps(server);
        if (ps.length > 0)
            processes.set(server, ns.ps(server));
    }
    return processes;
}

/**
 * Discovers every server hostname reachable from "home".
 *
 * @remarks
 * Performs a breadth-first search over the network using {@link NS.scan},
 * starting at "home", to find every server connected directly or indirectly.
 *
 * @param ns - Netscript API object.
 * @returns A set of every discovered hostname, including "home".
 */
export function GetAllServerNames(ns: NS): Set<string> {
    const visited = new Set<string>(["home"]);
    const queue: string[] = ["home"]
    while (queue.length > 0) {
      for (const child of ns.scan(queue.pop())) {
        if (visited.has(child)) continue;
        visited.add(child);
        queue.push(child);
      }
    }
    return visited;
}

/**
 * Determines whether a server can be used as a "hacking agent" (a server that runs attack scripts).
 *
 * @remarks
 * A server qualifies as an agent if it exists, root access has been obtained on it,
 * and it has more than 0 GB of RAM available to run scripts.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to check.
 * @returns True if the server exists, is rooted, and has usable RAM.
 */
export function IsAgent(ns: NS, hostname: string): boolean {
    if (!ns.serverExists(hostname)) return false;
    if (!ns.hasRootAccess(hostname)) return false;
    if (ns.getServerMaxRam(hostname) <= 0) return false;
    return true;
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
 * Determines whether a server is a valid hacking target ("victim").
 *
 * @remarks
 * A server qualifies as a victim if it exists, its required hacking skill does not exceed
 * the player's current hacking skill, root access has been obtained on it, and it has a
 * maximum money value greater than 0.
 *
 * @param ns - Netscript API object.
 * @param hostname - Hostname of the server to check.
 * @returns True if the server exists, is within hacking skill range, is rooted, and has money to steal.
 */
export function IsVictim(ns: NS, hostname: string): boolean {
    if (!ns.serverExists(hostname)) return false;
    if (ns.getServerRequiredHackingLevel(hostname) > ns.getPlayer().skills.hacking) return false;
    if (!ns.hasRootAccess(hostname)) return false;
    if (ns.getServerMaxMoney(hostname) <= 0) return false;
    return true;
}

/**
 * Prints a formatted line for every running process on the given servers.
 *
 * @remarks
 * Uses {@link GetAllProcesses} to gather all processes, then prints each one's PID,
 * filename, arguments, and thread count via {@link NS.tprintRaw}.
 *
 * @param ns - Netscript API object.
 * @param servers - Set of hostnames to list processes for.
 */
export function ListAllProcesses(ns: NS, servers: Set<string>): void {
  const processes = GetAllProcesses(ns, servers);
  for (const [hostname, proclist] of processes) {
    for (const proc of proclist) {
      ns.tprintRaw(`[${hostname}] [${proc.pid}] ${proc.filename} - ${proc.args} (${proc.threads})`);
    }
  }
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
  if (ns.scp(ns.ls("home", "scripts"), hostname, "home")) return true;
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
  PutBundle(ns, hostname);
  return true;
}