import {NS, DarknetResult, DarknetResponseCode, HeartbleedOptions, DarknetResponseCodeType} from "@ns";
import { AUTH_LOCK_PORT, DNET_SERVER_PORT } from "@/scripts/config";

export class ModelCracker {
    public latestHeartbleed?: DarknetResult & { logs: string[] };
    public latestAuthenticate?: DarknetResult & { data?: any };

    private constructor(
        public agent: string,
        public victim: string,
        public model: string,
        public passwordHint: string,
        public passwordLength: number,
        public passwordFormat: string,
        public enums: DarknetResponseCodeType) {}

    static async Create(ns: NS, victim: string): Promise<ModelCracker | undefined> {
        const details = ns.dnet.getServerDetails(victim);
        if (!details.isOnline) return undefined;
        return new ModelCracker(ns.getHostname(), victim, details.modelId, details.passwordHint, details.passwordLength, details.passwordFormat, ns.enums.DarknetResponseCode);
    }

    async SudoAuthenticate(ns: NS, password: string): Promise<DarknetResult & { data?: any } | DarknetResponseCode> {
        let result;
        do { result = await ns.dnet.authenticate(this.victim, password); }
        while (result.code === this.enums.RequestTimeOut);
        this.latestAuthenticate = result;
        if (result.code === this.enums.Success) return result;
        return result.code;
    }

    async SudoHeartbleed(ns: NS, options?: HeartbleedOptions): Promise<DarknetResult & { logs: string[] } | DarknetResponseCode> {
        let result;
        do { result = await ns.dnet.heartbleed(this.victim, options); }
        while (result.code === this.enums.RequestTimeOut);
        this.latestHeartbleed = result;
        if (result.code === this.enums.Success) return result;
        return result.code;
    }

    SetAuthLock(ns: NS): boolean {
        if (this.IsAuthLocked(ns)) return false;
        var locks: Map<string, string> | string = ns.readPort(AUTH_LOCK_PORT);
        if (typeof(locks) === "string") locks = new Map<string, string>();
        locks.set(this.victim, this.agent);
        return ns.tryWritePort(AUTH_LOCK_PORT, locks);
    }

    RemoveAuthLock(ns: NS): boolean {
        if (this.IsAuthLocked(ns)) return false;
        var locks: Map<string, string> | string = ns.readPort(AUTH_LOCK_PORT);
        if (typeof(locks) === "string") locks = new Map<string, string>();
        locks.delete(this.victim);
        return ns.tryWritePort(AUTH_LOCK_PORT, locks);
    }

    IsAuthLocked(ns: NS): boolean {
        var locks: Map<string, string> | string = ns.peek(AUTH_LOCK_PORT);
        if (typeof(locks) === "string") {
            locks = new Map<string, string>();
            ns.tryWritePort(AUTH_LOCK_PORT, locks);
        }
        return locks.has(this.victim);
    }

    RegisterAuth(ns: NS, password: string) {
        var registry: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
        if (typeof(registry) === "string") {
            registry = new Map<string, string>([[this.victim, password]]);
        } else {
        }
        return ns.tryWritePort(DNET_SERVER_PORT, registry);
    }

    UnregisterAuth(ns: NS) {
        var registry: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
        if (typeof(registry) === "string") {
            registry = new Map<string, string>();
        } else {
            registry.delete(this.victim);
        }
        return ns.tryWritePort(DNET_SERVER_PORT, registry);
    }

    AuthorizeRegisteredServer(ns: NS) {

    }

    ValidateRegistryData<T>(ns: NS, port: number, type: { new(): T ;} ): boolean {
        const data: T | string = ns.peek(port);
        if (typeof(data) !== "string") return true;
        const valid = new type();
        ns.clearPort(port);
        if (!ns.tryWritePort(port, valid)) {
            ns.tprintRaw(`[DATA LOSS] Could not write to ${port}!`);
            return false;
        }
        ns.tprintRaw(`wrote data to port`);
        return true;
    }
}


export async function main(ns: NS) {
    const cracker = await ModelCracker.Create(ns, "darkweb");
    ns.clearPort(33);
    if (cracker === undefined) {
        ns.tprintRaw(`wtf`);
        return;
    }
    cracker.ValidateRegistryData(ns, 33, Map<string, string>);
}