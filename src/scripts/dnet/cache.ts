import {NS} from "@ns";

export function main(ns: NS) {
    for (const file of ns.ls(ns.getHostname(), ".cache")) {
        ns.dnet.openCache(file);
    }
}