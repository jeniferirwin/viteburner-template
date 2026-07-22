import {NS} from "@ns";

export class Ports {
    static prep = 1;
    static batch = 2;
    static prepBlocked = false;
    static batchBlocked = false;

    static async waitPrepPort(): Promise<boolean> {
        const promise = new Promise<boolean>(async (resolve) => {
            while (Ports.prepBlocked === true) continue;
            resolve(true);
        });
        return promise;
    }

    static async waitBatchPort(): Promise<boolean> {
        const promise = new Promise<boolean>(async (resolve) => {
            while (Ports.batchBlocked === true) continue;
            resolve(true);
        });
        return promise;
    }

    static async addPreppedTarget(ns: NS, hostname: string): Promise<boolean> {
        await Ports.waitPrepPort();
        const promise = new Promise<boolean>(async (resolve, reject) => {
            if (!ns.serverExists(hostname)) {
                ns.tprintRaw(`[PREP] No such server '${hostname}'`);
                reject(false);
            }
            var port = ns.getPortHandle(Ports.prep);
            var entries: Array<string>;
            ns.tprintRaw(`[PREP] Before: ${port.peek()}`);
            Ports.prepBlocked = true;
            if (port.empty()) {
                entries = [hostname];
            } else {
                entries = port.read();
                if (entries.indexOf(hostname) < 0) {
                    entries.push(hostname);
                }
            }
            port.tryWrite(entries);
            Ports.prepBlocked = false;
            ns.tprintRaw(`[PREP] After: ${port.peek()}`);
            resolve(true);
        });
        return promise;
    }

    static async addBatchedTarget(ns: NS, hostname: string): Promise<boolean> {
        await Ports.waitBatchPort();
        const promise = new Promise<boolean>(async (resolve, reject) => {
            if (!ns.serverExists(hostname)) {
                ns.tprintRaw(`[BATCH] No such server '${hostname}'`);
                reject(false);
            }
            var port = ns.getPortHandle(Ports.batch);
            var entries: Array<string>;
            ns.tprintRaw(`[BATCH] Before: ${port.peek()}`);
            Ports.batchBlocked = true;
            if (port.empty()) {
                entries = [hostname];
            } else {
                entries = port.read();
                if (entries.indexOf(hostname) < 0) {
                    entries.push(hostname);
                }
            }
            port.tryWrite(entries);
            Ports.batchBlocked = false;
            ns.tprintRaw(`[BATCH] After: ${port.peek()}`);
            resolve(true);
        });
        return promise;
    }
}

export async function main(ns: NS) {
}