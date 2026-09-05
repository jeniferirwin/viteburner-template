import {NS} from "@ns";

export async function main(ns: NS) {
    ns.tprintRaw(`setting stasis link on ${ns.getHostname()}`);
    await ns.dnet.setStasisLink(true);
}