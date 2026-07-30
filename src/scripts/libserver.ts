import { NS, ProcessInfo } from "@ns";

export function getAllServerNames(ns: NS): Set<string> {
    var visited = new Set<string>(["home"]);
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

export function getAllProcesses(ns: NS): Map<string, ProcessInfo[]> {
  const servers = getAllServerNames(ns);
  const processes = new Map<string, ProcessInfo[]>();
  for (const server of servers) {
    processes.set(server, ns.ps(server));
  }
  return processes;
}

export function listAllProcesses(ns: NS): void {
  const processes = getAllProcesses(ns);
  for (var [hostname, proclist] of processes) {
    for (var proc of proclist) {
      ns.tprintRaw(`[${hostname}] [${proc.pid}] ${proc.filename} - ${proc.args} (${proc.threads})`);
    }
  }
}

export function main(ns: NS) {
  listAllProcesses(ns);
}