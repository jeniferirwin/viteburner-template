import { NS } from "@ns";

export function main(ns: NS) {
    for (const server of ns.dnet.getStasisLinkedServers()) {
        ns.tprintRaw(server);
    }
}