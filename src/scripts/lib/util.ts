import { NS } from "@ns";
import { WEAKEN_TABLE_PORT } from "./ports";


export function GetWeakenMultiplier(ns: NS, cores: number = 1): number {
    var table = ns.peek(WEAKEN_TABLE_PORT) as Array<number> | string;
    if (typeof(table) === "string") {
        if (CreateWeakenTable(ns))
            table = ns.peek(WEAKEN_TABLE_PORT) as Array<number>;
        else
            return 0;
    }
    return table[cores];
}

export function CreateWeakenTable(ns: NS): boolean {
    const WeakenTable = new Array<number>();
    WeakenTable.push(0);
    for (var i = 1; i < 200; i++) {
        WeakenTable.push(0.05 * (1 + (i - 1) / 16));
    }
    ns.clearPort(WEAKEN_TABLE_PORT);
    if (ns.tryWritePort(WEAKEN_TABLE_PORT, WeakenTable)) return true;
    return false;
}
