import {NS} from "@ns";

export async function main(ns: NS) {
    while (true) {
        if (!ns.hasTorRouter() && ns.getPlayer().money >= 200000) ns.singularity.purchaseTor();
        if (ns.hasTorRouter()) {
            const progs = ns.singularity.getDarkwebPrograms();
            for (const prog of progs) {
                ns.singularity.purchaseProgram(prog);
            }
        }
        ns.singularity.upgradeHomeRam();
        ns.singularity.upgradeHomeCores();
        await ns.sleep(5000);
    }
}