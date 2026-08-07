import {NS} from "@ns";

export function main(ns: NS) {
    const hostname = ns.args[0] as string ?? "n00dles";
    const multiplier = ns.args[1] as number ?? 1.01;
    for (var i = 1; i < 20; i++) {
    }
    for (var j = 1; j < 20; j++) {
        ns.tprintRaw(0.05 * (1 + (j - 1) / 16));
        // 1 + (cores - 1) / 16
    }
}