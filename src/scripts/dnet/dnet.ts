import {NS, DarknetServerDetails, DarknetResult } from "@ns";
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
    var servers: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
    if (typeof(servers) === "string") servers = new Map<string, string>();
    servers.set(server, password);
    ns.writePort(DNET_SERVER_PORT, servers);
    ns.tprintRaw(`Server ${server} registered with password: ${password}`);
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
    if (IsAuthLocked(ns, server) || !SetAuthLock(ns, server)) return false;
    const password = GetPassword(ns, server);
    if (password === undefined) {
        RemoveAuthLock(ns, server);
        return false;
    }
    const auth = await ns.dnet.authenticate(server, password);
    RemoveAuthLock(ns, server);
    return auth.success;
}

export async function TryModelHandler(ns: NS, server: string): Promise<boolean> {
    if (IsAuthLocked(ns, server) || !SetAuthLock(ns, server)) return false;
    const auth = await ModelHandler(ns, server, ns.dnet.getServerDetails(server));
    RemoveAuthLock(ns, server);
    return auth;
}

export async function Authorize(ns: NS, server: string): Promise<boolean> {
    var auth = await TryPassword(ns, server);
    if (auth === true) return true;
    return await TryModelHandler(ns, server);
}

export async function PutDnetBundle(ns: NS, server: string): Promise<boolean> {
    if (ns.scriptRunning("scripts/dnet/dnet.js", server)) return false;
    var files = ns.ls("home", "scripts/dnet/");
    files.push("scripts/config.js");
    var arg = "";
    /* const result = ns.dnet.connectToSession(server, GetPassword(ns, server) ?? "");
    if (!result.success) {
        ns.tprintRaw(`Could not transfer to ${server}`);
        return false;
    } */
    for (const file of files) {
        ns.scp(file, server, ns.getHostname());
    }
    if (ns.exec("scripts/dnet/dnet.js", server, { preventDuplicates: true })) return true;
    return false;
}

export function SetAuthLock(ns: NS, server: string): boolean {
    if (IsAuthLocked(ns, server)) return true;
    var locks: Set<string> = ns.readPort(AUTH_LOCK_PORT);
    locks.add(server);
    return ns.tryWritePort(AUTH_LOCK_PORT, locks);
}

export function RemoveAuthLock(ns: NS, server: string): boolean {
    if (!IsAuthLocked(ns, server)) return true;
    var locks: Set<string> = ns.readPort(AUTH_LOCK_PORT);
    locks.delete(server);
    return ns.tryWritePort(AUTH_LOCK_PORT, locks);
}

export function IsAuthLocked(ns: NS, server: string): boolean {
    const locks: Set<string> | string = ns.peek(AUTH_LOCK_PORT);
    if (typeof(locks) === "string") {
        ns.writePort(AUTH_LOCK_PORT, new Set<string>());
        return false;
    }
    return locks.has(server);
}

export async function Propagate(ns: NS): Promise<void> {
    const servers = ns.dnet.probe();
    for (const server of servers) {
        const auth = await Authorize(ns, server);
        if (auth === true) PutDnetBundle(ns, server);
    }
}

export async function ModelHandler(ns: NS, server: string, details: DarknetServerDetails): Promise<boolean> {
    let password;
    switch (details.modelId) {
        case "ZeroLogon":
            password = await HandleZeroLogon(ns, server);
            break;
        case "DeskMemo_3.1":
            password = await HandleDeskMemo(ns, server, details);
            break;
        case "FreshInstall_1.0":
            password = await HandleFreshInstall(ns, server, details);
            break;
        case "FreshInstall":
            password = await HandleFreshInstall(ns, server, details);
            break;
        case "CloudBlare(tm)":
            password = await HandleCloudBlare(ns, server, details);
            break;
        case "Laika4":
            password = await HandleLaika(ns, server, details);
            break;
        case "Factori-Os":
            password = await HandleFactorios(ns, server, details);
            break;
		case "NIL":
			password = await HandleNIL(ns, server, details);
			break;
        case "OpenWebAccessPoint":
            password = await HandleOpenWebAccessPoint(ns, server, details);
            break;
        case "AccountsManager_4.2":
            password = await HandleAccountManager(ns, server, details);
            break;
        case "OctantVoxel":
            password = await HandleOctantVoxel(ns, server, details);
            break;
        case "RateMyPix.Auth":
            password = await HandleRateMyPix(ns, server, details);
            break;
        default:
            var msg = await ns.dnet.heartbleed(server);
            ns.tprintRaw(`Crack needed for ${server} (model ${details.modelId})`);
            ns.tprintRaw(`Hint: (${details.passwordFormat}, ${details.passwordLength}) ${details.passwordHint} [${details.data}]`);
            ns.tprintRaw(`Heartbleed: ${msg.code} ${msg.message} ${msg.success}`);
            for (var line of msg.logs) {
                ns.tprintRaw(line);
            }
    }
    if (password !== undefined) {
        RegisterDnetServer(ns, server, password);
        return true;
    }
    return false;
}

export async function HandleAccountManager(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    for (var i = 0; i <= 10; i++) {
        const auth = await ns.dnet.authenticate(server, i.toString());
        if (auth.success) return i.toString();
    }
    return undefined;
}

export async function HandleOctantVoxel(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    if (details.data.length === 0) return undefined;
    const base = parseInt(details.data[0]);
    const number = details.data[1].toString();
    var result = 0;
    for (var i = number.length - 1; i >= 0; i--) {
        result += base ^ parseInt(number[i]);
    }
    const password = result.toString();
    const auth = await ns.dnet.authenticate(server, password);
    if (auth.success) return password;
    return undefined;
}

export async function HandleNIL(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    var numbers = new Array<number>();
    for (var i = 0; i <= 9; i++) {
        const total = numbers.join("") + i.toString();
        ns.tprintRaw(`trying ${total}`);
        const auth = await ns.dnet.authenticate(server, total);
        if (auth.success) return total;
        const feedback: DarknetResult = await ns.dnet.heartbleed(server);
        ns.tprintRaw(`feedback: ${feedback.message}`);
        if (!feedback.message.includes("yesn't")) {
            numbers.push(i);
            i = 0;
        }
    }
    return undefined;
}

export async function HandleFactorios(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    let auth;
    var upper = "";
    var lower = "1";
    for (var i = 0; i < details.passwordLength; i++) {
        upper += "9";
        if (i > 0) lower += "0";
    }
    for (var j = Number(lower); j <= Number(upper); j++) {
        auth = await ns.dnet.authenticate(server, String(j));
        if (auth.success) {
            ns.tprintRaw(`FactoriOS successful! ${details.passwordLength} - ${j}`);
            return String(j);
        }
    }
    return undefined;
}

export async function HandleLaika(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    let password, auth;
    if (details.passwordLength === 3) password = "max";
    if (details.passwordLength === 5) password = "rover";
    if (password !== undefined) {
        auth = await ns.dnet.authenticate(server, password);
        if (auth.success) return password;
    }
    for (const pw of ["fido", "spot"]) {
        auth = await ns.dnet.authenticate(server, pw);
        if (auth.success) return pw;
    }
    return undefined;
}
export async function HandleDeskMemo(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    const re = new RegExp(/(\d{1,3})/);
    const match = re.exec(details.passwordHint);
    if (match !== null) {
        const password = match[0];
        const auth = await ns.dnet.authenticate(server, password);
        if (auth.success) return password;
    }
    return undefined;
}

export async function HandleFreshInstall(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    let password;
    if (details.passwordLength === 4 && details.passwordFormat === "alphabetic") password = "root";
    if (details.passwordLength === 4 && details.passwordFormat === "numeric") password = "0000";
    if (details.passwordLength === 5 && details.passwordFormat === "alphabetic") password = "admin";
    if (details.passwordLength === 8) password = "password";
    if (password !== undefined) {
        var auth = await ns.dnet.authenticate(server, password);
        if (auth.success) return password;
    } else {
        for (const pw of ["12345", "00000", "1234"]) {
            auth = await ns.dnet.authenticate(server, pw);
            if (auth.success) return pw;
        }
    }
    ns.tprintRaw(`Unknown FreshInstall password on ${server}: ${details.passwordHint} (${details.passwordLength})`);
    return undefined;
}

export async function HandleZeroLogon(ns: NS, server: string): Promise<string | undefined> {
    const auth = await ns.dnet.authenticate(server, "");
    if (auth.success) return "";
    return undefined;
}

export async function HandleOpenWebAccessPoint(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    var auth = await ns.dnet.authenticate(server, "bleed");
    ns.tprint(`OpenWeb: ${auth.data}`);
    return undefined;
}

export async function HandleCloudBlare(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    const re = /\d/g;
    const match = details.data.matchAll(re);
    if (match !== null) {
        var password = "";
        for (const char of match) password += char;
        const auth = await ns.dnet.authenticate(server, password);
        if (auth.success) return password;
    }
    return undefined;
}

export async function HandleRateMyPix(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var result = 0;
    for (var char of "pepper") {
        result += alpha.indexOf(char) + 1;
    }
    const auth = await ns.dnet.authenticate(server, result.toString());
    if (auth.success) return result.toString();
    return undefined;
}
