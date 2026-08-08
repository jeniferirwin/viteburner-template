import {NS} from "@ns";

const TARGET_PORT = 2;

export function RegisterTarget(ns: NS, target: string): boolean {
    var db = ns.peek(TARGET_PORT) as Set<string> | string;
    if (typeof(db) === "string") {
        db = new Set<string>();
    } else if (db.has(target)) {
        return true;
    }
    ns.clearPort(TARGET_PORT);
    db.add(target);
    if (ns.tryWritePort(TARGET_PORT, db)) return true;
    ns.tprintRaw(`[ERROR] PID database failed to update properly when registering ${target}.`);
    return false;
}

export function UnregisterTarget(ns: NS, target: string): boolean {
    var db = ns.peek(TARGET_PORT) as Set<string> | string;
    if (typeof(db) === "string") return true;
    if (db.has(target)) db.delete(target);
    ns.clearPort(TARGET_PORT);
    if (ns.tryWritePort(TARGET_PORT, db)) return true;
    return false;
}