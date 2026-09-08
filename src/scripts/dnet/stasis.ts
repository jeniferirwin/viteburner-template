import {NS} from "@ns";

export async function main(ns: NS) {
    const arg = ns.args[0] as boolean;
    if (arg === undefined || arg === true) {
        await ns.dnet.setStasisLink(true);
        ns.tprintRaw(`Stasis link set on ${ns.getHostname()}`);
    } else {
        await ns.dnet.setStasisLink(false);
        ns.tprintRaw(`Stasis link removed from ${ns.getHostname()}`);
    }
}