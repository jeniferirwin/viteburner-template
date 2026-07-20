import {NS, ProcessInfo, Server} from "@ns";
import { Globals } from "./globals";

export function getServerFreeRam(ns: NS, hostname: string): number {
    if (ns.serverExists(hostname) && ns.hasRootAccess(hostname)) {
        return ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
    }
    return 0;
}

export function isRoot(ns: NS, hostname: string): boolean {
  if (!ns.serverExists(hostname)) return false;
  if (!ns.hasRootAccess(hostname)) return false;
  return true;
}

export function startShareScript(ns: NS, hostname: string) {
    var threads = getServerFreeRam(ns, hostname) / ns.getScriptRam(Globals.scriptShare, hostname);
    if (threads > 0) {
        ns.exec(Globals.scriptShare, hostname, threads);
    }
}

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

export function getParentServer(ns: NS, hostname: string): string | undefined {
    var links = getServerLinks(ns);
    for (var parent of links.keys()) {
        if (links.get(parent)?.findIndex(x => x === hostname) !== -1) {
            return parent;
        }
    }
    return undefined;
}

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

export function getAllServers(ns: NS): Map<string, Server> {
  var servers = new Map<string, Server>();
  var names = getAllServerNames(ns);
  for (var name of names) {
    servers.set(name, ns.getServer(name));
  }
  return servers;
}

export function getAllProcesses(ns: NS): Map<string, ProcessInfo[]> {
    var servers = getAllServerNames(ns);
    var pids = new Map<string, ProcessInfo[]>;
    for (var server of servers.values()) {
        pids.set(server, ns.ps(server));
    }
    return pids;
}

export function crackPorts(ns: NS, server: Server): boolean {
  if (server.openPortCount == 5) {
    return true;
  }
  if (!canCrackPorts(ns, server.hostname)) {
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

export function canCrackPorts(ns: NS, hostname: string): boolean {
  var reqPorts = ns.getServerNumPortsRequired(hostname);
  if (reqPorts === undefined) {
    ns.tprint(`Ports on ${hostname} are undefined, cannot crack`);
    return false;
  }
  return true;
}

export function canNuke(server: Server): boolean {
  var reqPorts = server.numOpenPortsRequired;
  var curPorts = server.openPortCount;
  if (reqPorts === undefined || curPorts === undefined || curPorts < reqPorts) {
    return false;
  }
  return true;
}

export function haveSkill(ns: NS, hostname: string): boolean {
  var skill = ns.getServerRequiredHackingLevel(hostname);
  if (skill === undefined || skill > ns.getPlayer().skills.hacking) {
      return false;
  }
  return true;
}

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