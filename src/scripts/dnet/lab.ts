import {NS} from "@ns";

export async function main(ns: NS) {
    if (ns.getHostname() === "home") {
        const host = "th3_l4byr1nth";
        const auth = await ns.dnet.connectToSession(host, "!!the:masterwork:of:daedalus<9977>!!");
        if (auth.success) {
            const script = "/scripts/dnet/cache.js";
            ns.scp(script, host);
            ns.exec(script, host);
        } else {
            ns.tprintRaw(`Could not connect to labyrinth: [${auth.code}] ${auth.message}`);
        }
    }
}