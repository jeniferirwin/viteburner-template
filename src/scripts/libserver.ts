import { NS } from "@ns";

/**
 * Discover every reachable server name by recursively scanning from "home",
 * plus any cloud server names.
 * @param ns NetScript reference.
 * @returns A set containing every discovered server hostname.
 */
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
