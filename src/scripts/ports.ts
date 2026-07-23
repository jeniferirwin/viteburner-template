import {NS} from "@ns";

export enum PORT {
    DUMMY,
    PREP,
    BATCH
}

export class Ports {
    static blocked: Set<PORT> = new Set<PORT>();

    static async waitPort(port: PORT): Promise<Boolean> {
        const promise = new Promise<boolean>(async (resolve) => {
            while (Ports.blocked.has(port)) continue;
            resolve(true);
        });
        return promise;
    }

    static async addTarget(ns: NS, hostname: string, port: PORT): Promise<boolean> {
        await Ports.waitPort(port);
        const promise = new Promise<boolean>(async (resolve, reject) => {
            if (!ns.serverExists(hostname)) {
                reject(`No such server ${hostname}`);
            }
            var handle = ns.getPortHandle(port);
            var entries: Set<string>;
            Ports.blocked.add(port);
            if (handle.empty()) {
                entries = new Set<string>([hostname]);
            } else {
                entries = handle.read();
                entries.add(hostname);
            }
            handle.clear();
            handle.tryWrite(entries);
            Ports.blocked.delete(port);
            resolve(true);
        });
        return promise;
    }

    static async peekTargets(ns: NS, port: PORT): Promise<Set<string>> {
        await Ports.waitPort(port);
        const promise = new Promise<Set<string>>(async (resolve) => {
            resolve(ns.peek(port).values());
        });
        return promise;
    }
}

export async function main(ns: NS) {
    
}