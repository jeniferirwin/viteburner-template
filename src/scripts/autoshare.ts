import {NS} from "@ns";

export async function main(ns: NS): Promise<void> {
    const script = "/scripts/sharing.js";
    while (true) {
        const cloud = ns.cloud.getServerNames();
        for (const server of cloud) {
            const ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
            const threads = Math.floor(ram / ns.getScriptRam(script, server))
            ns.exec(script, server, threads);
        }
        await ns.sleep(10001);
    }
}