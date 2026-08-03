import {NS} from "@ns";
import { GetAllServerNames } from "../lib/server";

export const CACHE_PORT = 1;

export async function main(ns: NS) {
    while (true) {
        const servers = GetAllServerNames(ns);
        ns.clearPort(CACHE_PORT);
        ns.tryWritePort(CACHE_PORT, servers);
        await ns.sleep(10000);
    }
}