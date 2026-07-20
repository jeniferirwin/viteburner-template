import {NS, ProcessInfo, Server} from "@ns";

/**
 * Combination function to check for root access without manually
 * needing to also check if the server exists.
 * @param ns NetScript reference.
 * @param hostname Hostname/IP of the server being checked.
 * @returns true if the server exists and player has root access, false otherwise.
 */
export function isRoot(ns: NS, hostname: string): boolean {
  if (!ns.serverExists(hostname) || !ns.hasRootAccess(hostname)) return false;
  return true;
}

/**
 * Get how much RAM is currently available on the given host. 
 * @param ns NetScript reference.
 * @param hostname Hostname/IP of the server being checked.
 * @returns The free RAM on the server. -1 if server not found or not rooted.
 */
export function getServerFreeRam(ns: NS, hostname: string): number {
    if (isRoot(ns, hostname)) {
      return (ns.getServerMaxRam(hostname) ?? 0) - (ns.getServerUsedRam(hostname) ?? 0);
    }
    return -1;
}

/**
 * Build a map of every server's hostname to the list of its unvisited
 * neighboring hostnames, based on ns.scan results.
 * @param ns NetScript reference.
 * @returns A map of hostname to an array of neighboring hostnames not yet visited.
 */
export function getServerLinks(ns: NS) {
    var links = new Map<string, Array<string>>();
    for (var server of getAllServers(ns).values()) {
        if (!links.has(server.hostname)) {
            var children = new Array<string>;
            for (var child of ns.scan(server.hostname)) {
                if (!links.has(child)) {
                    children.push(child);
                }
            }
            links.set(server.hostname, children);
        }
    }
    return links;
}

/**
 * Find the parent server that links to the given hostname.
 * @param ns NetScript reference.
 * @param hostname Hostname/IP of the server whose parent is being searched for.
 * @returns The hostname of the parent server, or undefined if none is found.
 */
export function getParentServer(ns: NS, hostname: string): string | undefined {
    var links = getServerLinks(ns);
    for (var parent of links.keys()) {
        if (links.get(parent)?.findIndex(x => x === hostname) !== -1) {
            return parent;
        }
    }
    return undefined;
}

/**
 * Discover every reachable server name by recursively scanning from "home",
 * plus any cloud server names.
 * @param ns NetScript reference.
 * @returns An array containing every discovered server hostname.
 */
export function getAllServerNames(ns: NS) {
  var servers = new Array<string>();
  servers.push("home");
  var changed = true;
  while (changed === true) {
    changed = false;
    for (var server of servers.values()) {
        var results = ns.scan(server);
        for (var result of results) {
            if (servers.indexOf(result) < 0) {
              servers.push(result);
              changed = true;
            } 
        }
    }
  }
  for (var cloudServer of ns.cloud.getServerNames()) {
    servers.push(cloudServer);
  }
  return servers;
}

/**
 * Get the full Server object for every discovered server.
 * @param ns NetScript reference.
 * @returns A map of hostname to its corresponding Server object.
 */
export function getAllServers(ns: NS): Map<string, Server> {
  var servers = new Map<string, Server>();
  var names = getAllServerNames(ns);
  for (var name of names) {
    servers.set(name, ns.getServer(name));
  }
  return servers;
}

/**
 * Get all servers that have root access and can hold money.
 * @param ns NetScript reference.
 * @returns A map of hostname to Server for every rooted, money-bearing server.
 */
export function getCrackedMoneyServers(ns: NS): Map<string, Server> {
  var crackedServers = new Map<string, Server>();
  var allServers = getAllServers(ns);
  for (var server of allServers.values()) {
    if (isRoot(ns, server.hostname) && (server.moneyMax ?? 0 > 0)) {
      crackedServers.set(server.hostname, server);
    }
  }
  return crackedServers;
}

/**
 * Get all servers that do not yet have root access but can hold money.
 * @param ns NetScript reference.
 * @returns A map of hostname to Server for every non-rooted, money-bearing server.
 */
export function getSecuredMoneyServers(ns: NS): Map<string, Server> {
  var securedServers = new Map<string, Server>();
  var allServers = getAllServers(ns);
  for (var server of allServers.values()) {
    if (!isRoot(ns, server.hostname) && (server.moneyMax ?? 0 > 0)) {
      securedServers.set(server.hostname, server);
    }
  }
  return securedServers;
}

/**
 * Get the list of running processes on every discovered server.
 * @param ns NetScript reference.
 * @returns A map of hostname to its array of running ProcessInfo entries.
 */
export function getAllProcesses(ns: NS): Map<string, ProcessInfo[]> {
    var servers = getAllServerNames(ns);
    var pids = new Map<string, ProcessInfo[]>;
    for (var server of servers.values()) {
        pids.set(server, ns.ps(server));
    }
    return pids;
}

/**
 * Check whether the number of ports required to crack the given server is known.
 * @param ns NetScript reference.
 * @param server The server being checked.
 * @returns true if the required port count is defined, false otherwise.
 */
export function canCrackPorts(ns: NS, server: Server): boolean {
  var reqPorts = ns.getServerNumPortsRequired(server.hostname);
  if (reqPorts === undefined) {
    ns.tprint(`Ports on ${server.hostname} are undefined, cannot crack`);
    return false;
  }
  return true;
}

/**
 * Attempt to open every available port-cracking program against the given server.
 * @param ns NetScript reference.
 * @param server The server to crack ports on.
 * @returns true if all ports are already open or at least one port
 * was newly cracked. False otherwise.
 */
export function crackPorts(ns: NS, server: Server): boolean {
  if (server.openPortCount == 5) {
    return true;
  }
  if (!canCrackPorts(ns, server)) {
    return false;
  }
  var anyCracked = false;
  if (!server.ftpPortOpen && ns.ftpcrack(server.hostname)) {
    anyCracked = true;
  }
  if (!server.sqlPortOpen && ns.sqlinject(server.hostname)) {
    anyCracked = true;
  }
  if (!server.sshPortOpen && ns.brutessh(server.hostname)) {
    anyCracked = true;
  }
  if (!server.httpPortOpen && ns.httpworm(server.hostname)) {
    anyCracked = true;
  }
  if (!server.smtpPortOpen && ns.relaysmtp(server.hostname)) {
    anyCracked = true;
  }
  return anyCracked;
}

/**
 * Check whether enough ports have been opened on the server to run NUKE.exe.
 * @param server The server being checked.
 * @returns true if enough ports are open to nuke the server, false otherwise.
 */
export function canNuke(server: Server): boolean {
  var reqPorts = server.numOpenPortsRequired;
  var curPorts = server.openPortCount;
  if (reqPorts === undefined || curPorts === undefined || curPorts < reqPorts) {
    return false;
  }
  return true;
}

/**
 * Check whether the player's hacking skill meets the server's requirement.
 * @param ns NetScript reference.
 * @param server The server being checked.
 * @returns true if the player's hacking skill is sufficient, false otherwise.
 */
export function haveSkill(ns: NS, server: Server): boolean {
  var skill = server.requiredHackingSkill;
  if (skill === undefined || skill > ns.getPlayer().skills.hacking) {
      return false;
  }
  return true;
}

/**
 * Copy the local script bundle from home to the given server, replacing any existing files.
 * @param ns NetScript reference.
 * @param hostname Hostname/IP of the server to receive the bundle.
 * @returns true if the bundle was transferred successfully, false otherwise.
 */
export function putBundle(ns: NS, hostname: string): boolean {
  if (hostname === "home") {
    return false;
  }
  try {
    const bundle = ns.ls("home", "scripts");
    for (var file of bundle) {
      ns.rm(file, hostname);
    }
    ns.scp(bundle, hostname);
  }
  catch(error) {
    ns.tprint(`Bundle transfer to ${hostname} failed: ${error}`);
    return false;
  }
  return true;
}

/**
 * Get the amount of free RAM on every discovered server.
 * @param ns NetScript reference.
 * @returns A map of hostname to its free RAM, excluding servers with no usable RAM.
 */
export function getAllGlobalRAM(ns: NS): Map<string, number> {
    var data = new Map<string, number>();
    var servers = getAllServerNames(ns);
    for (var server of servers) {
        var used = ns.getServerUsedRam(server);
        var max = ns.getServerMaxRam(server);
        if (used === undefined || max === undefined || max <= 0) {
            continue;
        }
        var ram = max - used;
        data.set(server, ram);
    }
    return data;
}