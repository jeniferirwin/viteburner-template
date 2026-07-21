import {NS} from "@ns";

export async function main(ns: NS) {
    const pct = 0.05;
    while (true) {
        if (ns.hacknet.getPurchaseNodeCost() < pct * ns.getPlayer().money) {
            ns.hacknet.purchaseNode();
        }
        for (var i = 0; i < ns.hacknet.numNodes(); i++) {
            if (ns.hacknet.getLevelUpgradeCost(i) < pct * ns.getPlayer().money) {
                ns.hacknet.upgradeLevel(i);
            }
            if (ns.hacknet.getRamUpgradeCost(i) < pct * ns.getPlayer().money) {
                ns.hacknet.upgradeRam(i);
            }
            if (ns.hacknet.getCoreUpgradeCost(i) < pct * ns.getPlayer().money) {
                ns.hacknet.upgradeCore(i);
            }
        }
        await ns.sleep(1000);
    }
}