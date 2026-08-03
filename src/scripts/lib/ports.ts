import {NS} from "@ns";

export class Ports {
    static blocked: Set<number> = new Set<number>();

    static async waitPort(port: number): Promise<Boolean> {
        const promise = new Promise<boolean>(async (resolve) => {
            while (Ports.blocked.has(port)) continue;
            resolve(true);
        });
        return promise;
    }

    static async addHost(ns: NS, hostname: string, port: number): Promise<boolean> {
        await Ports.waitPort(port);
        const promise = new Promise<boolean>(async (resolve) => {
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

    static async peekHosts(ns: NS, port: number): Promise<Set<string>> {
        await Ports.waitPort(port);
        const promise = new Promise<Set<string>>(async (resolve) => {
            resolve(ns.peek(port).values());
        });
        return promise;
    }

    static async hostExists(ns: NS, hostname: string, port: number): Promise<boolean> {
        await Ports.waitPort(port);
        var hosts = await Ports.peekHosts(ns, port);
        const promise = new Promise<boolean>(async (resolve) => {
            resolve(hosts.has(hostname));
        });
        return promise;
    }
}
