import {ScriptArg, NS, ProcessInfo, Server} from "@ns";
import {AttackAssignment} from "./tasks";
import { Globals } from "./globals";

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
