import {NS} from "@ns";

export async function main(ns: NS) {
    var servers = ns.cloud.getServerNames();
    while (true) {
        var tiers = getCloudTiers();
        if (servers.length < ns.cloud.getServerLimit()) {
            if (ns.cloud.getServerCost(2 ** 10) < ns.getPlayer().money) {
                ns.cloud.purchaseServer("entropy", 2 ** 10);
            }
        }
        for (var server of servers) {
            var nextTier = tiers.indexOf(ns.getServerMaxRam(server)) + 1;
            if (nextTier < tiers.length) {
                var cost = ns.cloud.getServerUpgradeCost(server, tiers[nextTier]);
                if (cost <= ns.getPlayer().money) {
                    ns.cloud.upgradeServer(server, tiers[nextTier]);
                }   
            }
        }
        await ns.sleep(0);
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
