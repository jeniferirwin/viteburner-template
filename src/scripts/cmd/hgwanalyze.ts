import {NS} from "@ns";

export function main(ns: NS) {
    const hostname = ns.args[0] as string ?? "n00dles";
    const threads = 50;
    const diff = 8.2;
    for (var j = 1; j < 20; j++) {
        const base = diff / (0.05 * (1 + (j - 1) / 16));
    }
}