import { NS } from "@ns";

export async function main(ns: NS) {
    while (ns.dnet.getBlockedRam() > 0) {
        await ns.dnet.memoryReallocation();
        if (!ns.scriptRunning("scripts/dnet/haxor.js")) {
            ns.run("scripts/dnet/haxor.js");
        }
    }
}