import {ScriptArg, NS, ProcessInfo, Server} from "@ns";
import {AttackAssignment} from "./tasks";
import { Globals } from "./globals";
import { ServerXT, getServerXT } from "./serverxt";

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

export function listAllFiles(ns: NS) {
  var servers = getAllServers(ns);
  for (var [serverName, server] of servers) {
    if (serverName === "home") continue;
    for (var file of ns.ls(serverName)) {
      if (file.startsWith("scripts")) continue;
      ns.tprintRaw(`${serverName} - ${file}`);
    }
  }
}

/**
 * Get the full Server object for every discovered server.
 * @param ns NetScript reference.
 * @returns A map of hostname to its corresponding Server object.
 */
export function getAllServers(ns: NS): Map<string, Server> {
  var servers = new Map<string, ServerXT>();
  var names = getAllServerNames(ns);
  for (var name of names) {
    var server = getServerXT(ns, name);
    if (server !== undefined) servers.set(name, server);
  }
  return servers;
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

export function main(ns: NS) {
  listAllFiles(ns);
}