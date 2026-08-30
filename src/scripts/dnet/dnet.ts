import {NS, DarknetServerDetails, DarknetResult, DarknetResponseCode } from "@ns";
import { DNET_SERVER_PORT, AUTH_LOCK_PORT } from "../config";

export async function main(ns: NS) {
    while (true) {
        const overwrite = ns.args[0] === "o";
        const localhost = ns.getHostname();
        await Propagate(ns);
        for (const cache of ns.ls(localhost, ".cache")) ns.dnet.openCache(cache);
        StartPhishing(ns);
        await ns.dnet.nextMutation();
        continue;
    }
}

export function StartPhishing(ns: NS): boolean {
    const server = ns.getHostname();
    const script = "scripts/dnet/phishing.js";
    if (ns.scriptRunning(script, server)) return true;
    if (server !== "home") {
        const threads = Math.floor((ns.getServerMaxRam(server) - 8) / ns.getScriptRam(script));
        if (threads < Number.POSITIVE_INFINITY) {
            if (ns.exec(script, server, { threads: threads, preventDuplicates: true })) return true;
        }
    }
    return false;
}

export function RegisterDnetServer(ns: NS, server: string, password: string): void {
    const details = ns.dnet.getServerDetails(server);
    var servers: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
    if (typeof(servers) === "string") servers = new Map<string, string>();
    servers.set(server, password);
    ns.writePort(DNET_SERVER_PORT, servers);
    ns.tprintRaw(`Registered ${details.modelId} server ${server} with password ${password}`);
}

export function UnregisterDnetServer(ns: NS, server: string): void {
    var servers: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
    if (typeof(servers) === "string") servers = new Map<string, string>();
    servers.delete(server);
    ns.writePort(DNET_SERVER_PORT, servers);
}

export function GetPassword(ns: NS, server: string): string | undefined {
    const servers: Map<string, string> | string = ns.peek(DNET_SERVER_PORT);
    if (typeof(servers) !== "string") return servers.get(server);
    return undefined;
}

export async function TryPassword(ns: NS, server: string): Promise<boolean> {
    if (!SetAuthLock(ns, server)) return false;
    const password = GetPassword(ns, server);
    if (password === undefined) {
        RemoveAuthLock(ns, server);
        return false;
    }
    const auth = await ns.dnet.authenticate(server, password);
    RemoveAuthLock(ns, server);
    return auth.success;
}

export async function PutDnetBundle(ns: NS, server: string): Promise<boolean> {
    if (ns.scriptRunning("scripts/dnet/dnet.js", server)) return false;
    var files = ns.ls("home", "scripts/dnet/");
    files.push("scripts/config.js");
    var arg = "";
    for (const file of files) {
        ns.scp(file, server, ns.getHostname());
    }
    if (ns.exec("scripts/dnet/dnet.js", server, { preventDuplicates: true })) return true;
    return false;
}

export function SetAuthLock(ns: NS, server: string): boolean {
    const locked = GetAuthLock(ns, server);
    if (locked !== undefined) return false;
    var locks: Map<string, string> = ns.readPort(AUTH_LOCK_PORT);
    locks.set(server, ns.getHostname());
    return ns.tryWritePort(AUTH_LOCK_PORT, locks);
}

export function RemoveAuthLock(ns: NS, server: string): boolean {
    if (GetAuthLock(ns, server) !== ns.getHostname()) return false;
    var locks: Map<string, string> = ns.readPort(AUTH_LOCK_PORT);
    locks.delete(server);
    return ns.tryWritePort(AUTH_LOCK_PORT, locks);
}

export function GetAuthLock(ns: NS, server: string): string | undefined {
    var locks: Map<string, string> | string = ns.peek(AUTH_LOCK_PORT);
    if (typeof(locks) === "string") {
        locks = new Map<string, string>();
        ns.writePort(AUTH_LOCK_PORT, locks);
    }
    return locks.get(server);
}

export async function Propagate(ns: NS): Promise<void> {
    const servers = ns.dnet.probe();
    for (const server of servers) {
        const details = ns.dnet.getServerDetails(server);
        if (!details.isOnline) continue;
        const auth = await TryPassword(ns, server);
        if (auth) {
            PutDnetBundle(ns, server);
            RemoveAuthLock(ns, server);
            continue;
        }
        ModelHandler(ns, server, details);
    }
}

export const DarknetModelTable: Map<string, string> = new Map<string, string>([
    [ "ZeroLogon", "zerologon.js" ],
    [ "DeskMemo", "deskmemo.js" ],
    [ "FreshInstall", "freshinstall.js" ],
    [ "CloudBlare", "cloudblare.js" ],
    [ "Laika", "laika.js" ],
    [ "Factori", "factorios.js" ],
    [ "NIL", "nil.js" ],
    [ "OpenWebAccessPoint", "openwebaccesspoint.js" ],
    [ "AccountsManager", "accountsmanager.js" ],
    [ "OctantVoxel", "octantvoxel.js" ],
    [ "RateMyPix", "ratemypix.js" ],
    [ "PHP", "php.js"],
    [ "DeepGreen", "deepgreen.js" ],
    [ "BellaCuore", "bellacuore.js" ],
    [ "KingOfTheHill", "kingofthehill.js" ]
]);

export function ModelHandler(ns: NS, server: string, details: DarknetServerDetails): boolean {
    let path = "scripts/dnet/models/";
    for (const [model, script] of DarknetModelTable) {
        if (details.modelId.includes(model)) {
            if (SetAuthLock(ns, server)) {
                ns.run(path + script, { preventDuplicates: true }, server);
                return true;
            }
        }
    }
    return false;
}

export async function SudoAuthenticate(ns: NS, server: string, password: string): Promise<DarknetResult & { data?: any } | undefined> {
    const enums = ns.enums.DarknetResponseCode;
    let auth;
    do { auth = await ns.dnet.authenticate(server, password); }
    while (auth.code === enums.RequestTimeOut);
    if (auth.code === enums.Success) return auth;
    return undefined;
}

export async function SudoHeartbleed(ns: NS, server: string): Promise<DarknetResult & { logs: string[] } | undefined> {
    const enums = ns.enums.DarknetResponseCode;
    let bleed;
    do { bleed = await ns.dnet.heartbleed(server); }
    while (bleed.code === enums.RequestTimeOut);
    if (bleed.code === enums.Success) return bleed;
    return undefined;
}

export type Heartbleed = {
    code: DarknetResult,
    logs: string[],
}

export type HeartbleedLogLine = {
    code: DarknetResponseCode,
    message: string,
    data?: string,
    passwordAttempted: string,
}
