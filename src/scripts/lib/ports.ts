import {NS} from "@ns";

export function ValidateRegistryData<T>(ns: NS, port: number, type: { new(): T } ): T {
    const data: T | string = ns.peek(port);
    if (typeof(data) !== "string") return data;
    const valid = new type();
    if (!ns.tryWritePort(port, valid)) {
        ns.tprintRaw(`[ERROR] Could not write to ${port}!`);
        return new type();
    }
    return valid as T;
}
