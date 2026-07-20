import {NS} from "@ns";
import { putBundle } from "./libserver.ts";

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
    if (ns.args.length > 0) {
        if (ns.args[0].valueOf() === "scripts") {
            var i = 0;
            for (var server of servers) {
                putBundle(ns, server);
                ns.killall(server);
                var ram = ns.getServerMaxRam(server);
                var threads = Math.floor(ram / ns.getScriptRam("scripts/sharing.js"));
                ns.exec("scripts/sharing.js", server, threads)
                i++;
            }
        }
    }
    while (true) {
        servers = ns.cloud.getServerNames();
        var tiers = getCloudTiers(ns);
        if (servers.length < ns.cloud.getServerLimit()) {
            if (ns.cloud.getServerCost(16) < ns.getPlayer().money * 0.10) {
                var name = CloudNames[servers.length + 1];
                ns.cloud.purchaseServer(name, 16);
                // ns.tprint(`Purchased cloud server ${name}`);
            }
        }
        for (var server of servers) {
            var nextTier = tiers.indexOf(ns.getServerMaxRam(server)) + 1;
            if (nextTier < tiers.length) {
                var cost = ns.cloud.getServerUpgradeCost(server, tiers[nextTier]);
                var ram = tiers[nextTier];
                if (cost <= ns.getPlayer().money / servers.length) {
                    ns.cloud.upgradeServer(server, tiers[nextTier]);
                   // ns.tprint(`Upgraded ${server} to ${ram} for ${cost}`);
                    ns.killall(server);
                    var threads = Math.floor(tiers[nextTier] / ns.getScriptRam("scripts/sharing.js"));
                    ns.exec("scripts/sharing.js", server, threads)
                }   
            }
        }
        await ns.sleep(1000);
    }
}

export function getCloudTiers(ns: NS): Array<number> {
    var gb = 2;
    var list = new Array<number>;
    while (gb < 2 ** 20) {
        list.push(gb);
        gb = gb * 2; 
    }
    return list;
}
