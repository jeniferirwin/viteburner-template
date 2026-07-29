import {NS} from "@ns";
import { getAllServerNames } from "./libserver";

export async function main(ns: NS) {
    while (true) {
        await ns.sleep(0);
    } 
}