import {NS, Server} from "@ns";
import { GetAllServerNames } from "../lib/server";
import { CACHE_PORT } from "../lib/const";

export enum VictimState {
    NONE,
    SECURE,
    BREACHED,
    PREPPED
}

export class CacheEntry {
    hostname: string;
    cpuCores: number;
    backdoorInstalled: boolean;
    purchasedByPlayer: boolean;
    serverGrowth: number;
    numOpenPortsRequired?: number;
    openPortCount?: number;
    isAgent: boolean = false;
    isVictim: boolean = false;

    constructor(public ns: NS, public server: Server) {
        this.hostname = server.hostname;
        this.cpuCores = server.cpuCores;
        this.backdoorInstalled = server.backdoorInstalled ?? false;
        this.purchasedByPlayer = server.purchasedByPlayer;
        this.serverGrowth = server.serverGrowth ?? 0;
        this.numOpenPortsRequired = server.numOpenPortsRequired ?? 0;
        this.openPortCount = server.openPortCount ?? 0;
        this.Rootkit(ns);
        this.SetRole(ns);
    }

    SetRole(ns: NS): void {
        if (!ns.hasRootAccess(this.hostname)) return;
        if (this.purchasedByPlayer) {
            this.isAgent = true;
            this.isVictim = false;
            return;
        }
        if (ns.getServerMaxRam(this.hostname) > 0) this.isAgent = true;
        if (ns.getServerMaxMoney(this.hostname) > 0) this.isVictim = true;
    }

    GetTotalRAM(ns: NS, script: string, threads: number = 1): number {
        threads = Math.round(threads);
        if (threads < 1 && threads >= Number.POSITIVE_INFINITY) return 0;
        return threads * ns.getScriptRam(script, this.hostname);
    }

    CrackPorts(ns: NS): void {
        if (ns.fileExists("BruteSSH.exe", "home")) ns.brutessh(this.hostname);
        if (ns.fileExists("FTPCrack.exe", "home")) ns.ftpcrack(this.hostname);
        if (ns.fileExists("HTTPWorm.exe", "home")) ns.httpworm(this.hostname);
        if (ns.fileExists("RelaySMTP.exe", "home")) ns.relaysmtp(this.hostname);
        if (ns.fileExists("SQLInject.exe", "home")) ns.sqlinject(this.hostname);
    }

    GetSecDiff(ns: NS): number {
        return ns.getServerSecurityLevel(this.hostname) - ns.getServerMinSecurityLevel(this.hostname);
    }

    GetMoneyDiff(ns: NS): number {
        return ns.getServerMaxMoney(this.hostname) - ns.getServerMoneyAvailable(this.hostname);
    }

    GetOpenRAM(ns: NS): number {
        if (this.isAgent === false) return 0;
        return ns.getServerMaxRam(this.hostname) - ns.getServerUsedRam(this.hostname);
    }

    GetState(ns: NS): VictimState {
        if (this.isVictim === false) return VictimState.NONE;
        if (this.GetSecDiff(ns) > 0) return VictimState.SECURE;
        if (this.GetMoneyDiff(ns) > 0) return VictimState.BREACHED;
        return VictimState.PREPPED;
    }

    Rootkit(ns: NS): boolean {
        if (ns.hasRootAccess(this.hostname)) return true;
        const portsRequired = this.numOpenPortsRequired ?? 0;
        if (portsRequired < 0 || portsRequired > 5) return false;
        this.CrackPorts(ns);
        if (this.IsNukable()) ns.nuke(this.hostname);
        if (!ns.hasRootAccess(this.hostname)) return false;
        this.PutBundle(ns);
        return true;
    }

    PutBundle(ns: NS): boolean {
        if (!this.isAgent) return false;
        if (ns.scp(ns.ls("home", "/scripts/task/atk_"), this.hostname, "home")) return true;
        return false;
    }

    IsNukable(): boolean {
        if ((this.openPortCount ?? 0) < (this.numOpenPortsRequired ?? Number.POSITIVE_INFINITY)) return false;
        return true;
    }
}

export class CacheDB {
    entries: Array<CacheEntry> = new Array<CacheEntry>();

    push(entry: CacheEntry) {
        this.entries.push(entry);
    }

    get(hostname: string): CacheEntry | undefined {
        return this.entries.find((entry) => entry.hostname === hostname);
    }

    refresh(ns: NS) {
        this.entries = new Array<CacheEntry>();
        ns.clearPort(CACHE_PORT);
        const servers = GetAllServerNames(ns);
        for (const server of servers) this.push(new CacheEntry(ns, ns.getServer(server)));
        if (!ns.tryWritePort(CACHE_PORT, this)) {
            ns.tprintRaw(`[WARN] CacheDB failed to update server list!`);
        }
    }
}

export async function main(ns: NS) {
    const db = new CacheDB();
    while (true) {
        db.refresh(ns);
        await ns.sleep(10000);
    }
}