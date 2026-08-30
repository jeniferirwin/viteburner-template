import {NS} from "@ns";

export function main(ns: NS) {
    for (var i = 1; i < 100000; i++) {
        const data = ns.peek(i);
        if (typeof(data) !== "string") {
            ns.tprintRaw(`Port ${i} has data of type ${typeof(data)}: ${data}`);
        }
    }
}