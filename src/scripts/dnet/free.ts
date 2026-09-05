import { NS } from "@ns";

export async function main(ns: NS) {
    if (ns.dnet.getBlockedRam() === 0) {
        if (!ns.scriptRunning("scripts/dnet/haxor.js")) {
            ns.run("scripts/dnet/haxor.js");
        }
        return;
    }
    while (ns.dnet.getBlockedRam() > 0) {
        await ns.dnet.memoryReallocation();
        if (!ns.scriptRunning("scripts/dnet/haxor.js")) {
            ns.run("scripts/dnet/haxor.js");
        }
    }
}