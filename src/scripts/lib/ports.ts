import {NS} from "@ns";

export function ValidateRegistryData<T>(ns: NS, port: number, type: { new(): T } ): boolean {
    const data: T | string = ns.peek(port);
    if (typeof(data) !== "string") return true;
    const valid = new type();
    ns.clearPort(port);
    if (!ns.tryWritePort(port, valid)) {
        ns.tprintRaw(`[ERROR] Could not write to ${port}!`);
        return false;
    }
    return true;
}
