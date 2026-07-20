import {NS} from "@ns";

export async function main(ns: NS) {
    while (true) {
        if (ns.hacknet.getPurchaseNodeCost() < 0.2 * ns.getPlayer().money) {
            ns.hacknet.purchaseNode();
        }
        for (var i = 0; i < ns.hacknet.numNodes(); i++) {
            if (ns.hacknet.getLevelUpgradeCost(i) < 0.2 * ns.getPlayer().money) {
                ns.hacknet.upgradeLevel(i);
            }
            if (ns.hacknet.getRamUpgradeCost(i) < 0.2 * ns.getPlayer().money) {
                ns.hacknet.upgradeRam(i);
            }
            if (ns.hacknet.getCoreUpgradeCost(i) < 0.2 * ns.getPlayer().money) {
                ns.hacknet.upgradeCore(i);
            }
        }
        await ns.sleep(100);
    }
}