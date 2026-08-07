import { NS, ProcessInfo } from "@ns";

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
    for (const hostname of servers) {
        const ps = ns.ps(hostname);
        if (ps.length > 0)
            processes.set(hostname, ns.ps(hostname));
    }
    return processes;
}

/**
 * Discovers every server hostname reachable from "home".
 *
 * @remarks
 * Performs a depth-first search over the network (using a stack) with {@link NS.scan},
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
