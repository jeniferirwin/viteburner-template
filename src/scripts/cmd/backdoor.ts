import {NS} from "@ns";
import { GetCache, GetCoreTable } from "../daemon/cacher";

export function main(ns: NS) {
    const cache = GetCache(ns);
    if (cache === undefined) return;

    
}