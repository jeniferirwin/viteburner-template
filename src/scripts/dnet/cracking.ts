import {NS} from "@ns";

export async function main(ns: NS) {
    ns.tprintRaw(JSON.stringify(ns.dnet.getServerDetails("iron_gym")));
}