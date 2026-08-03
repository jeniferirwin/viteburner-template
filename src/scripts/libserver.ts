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

export function listAllProcesses(ns: NS): void {
  const processes = getAllProcesses(ns);
  for (var [hostname, proclist] of processes) {
    for (var proc of proclist) {
      ns.tprintRaw(`[${hostname}] [${proc.pid}] ${proc.filename} - ${proc.args} (${proc.threads})`);
    }
  }
}

export function isAgent(ns: NS, hostname: string) {
    if (!ns.serverExists(hostname)) return false;
    if (!ns.hasRootAccess(hostname)) return false;
    if (ns.getServerMaxRam(hostname) <= 0) return false;
    return true;
}

export function isVictim(ns: NS, hostname: string) {
    if (!ns.serverExists(hostname)) return false;
    if (ns.getServerRequiredHackingLevel(hostname) > ns.getPlayer().skills.hacking) return false;
    if (!ns.hasRootAccess(hostname)) return false;
    if (ns.getServerMaxMoney(hostname) <= 0) return false;
    return true;
}


export function getAllProcesses(ns: NS): Map<string, ProcessInfo[]> {
    var processes = new Map<string, ProcessInfo[]>();
    for (const server of getAllServerNames(ns)) {
        const ps = ns.ps(server);
        if (ps.length > 0)
            processes.set(server, ns.ps(server));
    }
    return processes;
}

export function isBeingAttacked(ns: NS, hostname: string) {
    if (!isVictim(ns, hostname)) return false;
    for (var [server, info] of getAllProcesses(ns)) {
        var filtered: ProcessInfo[] = info.filter((proc) => proc.args.indexOf(hostname) >= 0);
        for (var entry of filtered) {
            if (entry.filename.includes("scripts/atk") && entry.args.includes(hostname)) {
                return true;
            }
        }
    }
    return false;
}

export function main(ns: NS) {
    ns.disableLog("ALL");
    var start = performance.now();
    ns.tprint(isBeingAttacked(ns, "n00dles"));
    var end = performance.now();
    ns.tprintRaw(`Total ms: ${end - start}`);
}