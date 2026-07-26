import {NS} from "@ns";
import { Globals } from "./globals.ts";

enum CloudNames {
    "alfa",
    "bravo",
    "charlie",
    "delta",
    "echo",
    "foxtrot",
    "golf",
    "hotel",
    "india",
    "juliett",
    "kilo",
    "lima",
    "mike",
    "november",
    "oscar",
    "papa",
    "quebec",
    "romeo",
    "sierra",
    "tango",
    "uniform",
    "victor",
    "whiskey",
    "xray",
    "yankee",
    "zulu"
};

export async function main(ns: NS) {
    var servers = ns.cloud.getServerNames();
    while (true) {
        var tiers = getCloudTiers();
        if (servers.length < ns.cloud.getServerLimit()) {
            if (ns.cloud.getServerCost(2) < ns.getPlayer().money * 0.05) {
                var name = CloudNames[servers.length + 1];
                ns.cloud.purchaseServer(name, 2);
            }
        }
        for (var server of servers) {
            var nextTier = tiers.indexOf(ns.getServerMaxRam(server)) + 1;
            if (nextTier < tiers.length) {
                var cost = ns.cloud.getServerUpgradeCost(server, tiers[nextTier]);
                var ram = tiers[nextTier];
                if (cost <= ns.getPlayer().money / servers.length) {
                    ns.cloud.upgradeServer(server, tiers[nextTier]);
                }   
            }
        }
        await ns.sleep(10000);
    }
}

export function getCloudTiers(): Array<number> {
    var gb = 2;
    var list = new Array<number>;
    while (gb < 2 ** 20) {
        list.push(gb);
        gb = gb * 2; 
    }
    return list;
}
