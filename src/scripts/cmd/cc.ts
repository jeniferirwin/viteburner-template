import {NS} from "@ns";
import { GetAllServerNames } from "../lib/server";

export function main(ns: NS) {
    const servers = GetAllServerNames(ns);
    for (const server of servers) {
        for (const file of ns.ls(server, "cct")) {
            const contract = ns.codingcontract.getContract(file, server);
            ns.tprint(contract.description);
        }
    }
}