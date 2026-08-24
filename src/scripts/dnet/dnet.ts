import {NS, DarknetServerDetails, Darknet} from "@ns";
import { DNET_SERVER_PORT, DNET_SWEEP_PORT } from "../config";

export async function HandleNIL(ns: NS, server: string, details: DarknetServerDetails): Promise<string> {
    var numbers = Array<number>();
    numbers.fill(0, 0, 4);
    var password = numbers.join("");
    var auth = await ns.dnet.authenticate(server, password);
	ns.tprintRaw(auth.data);
	return password;
}

export async function HandleFactorios(ns: NS, server: string, details: DarknetServerDetails): Promise<string | undefined> {
    let auth;
    var limit = "";
    for (var i = 0; i < details.passwordLength; i++) {
        limit += "9";
    }
    for (var j = 0; j <= Number(limit); j++) {
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
    const re = new RegExp(/(\d{3,3})/);
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
        for (const pw of ["12345", "00000"]) {
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
    for (var line of auth.data) {
        ns.tprintRaw(`OpenWeb: ${line}`);
    }
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

export function RegisterDnetServer(ns: NS, server: string, password: string): void {
    var servers: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
    if (typeof(servers) === "string") servers = new Map<string, string>();
    servers.set(server, password);
    ns.writePort(DNET_SERVER_PORT, servers);
}

export function UnregisterDnetServer(ns: NS, server: string): void {
    var servers: Map<string, string> | string = ns.readPort(DNET_SERVER_PORT);
    if (typeof(servers) === "string") servers = new Map<string, string>();
    servers.delete(server);
    ns.writePort(DNET_SERVER_PORT, servers);
}

export function GetDnetPassword(ns: NS, server: string): string | undefined {
    const servers: Map<string, string> | string = ns.peek(DNET_SERVER_PORT);
    if (typeof(servers) !== "string") return servers.get(server);
    return undefined;
}

export function AddVisitedNode(ns: NS, server: string) {
    var visited: Set<string> | string = ns.readPort(DNET_SWEEP_PORT);
    ns.clearPort(DNET_SWEEP_PORT);
    if (typeof(visited) === "string") visited = new Set<string>();
    visited.add(server);
    ns.writePort(DNET_SWEEP_PORT, visited);
}

export function WasVisited(ns: NS, server: string): boolean {
    var visited: Set<string> | string = ns.peek(DNET_SWEEP_PORT);
    if (typeof(visited) === "string") return false;
    return visited.has(server);
}

export async function Propagate(ns: NS, overwrite: boolean): Promise<void> {
    const servers = ns.dnet.probe();
    for (const server of servers) {
        const details = ns.dnet.getServerDetails(server);
        if (!details.isOnline || WasVisited(ns, server)) continue;
        if (await ModelHandler(ns, server, details)) {
            if (overwrite) {
                ns.scp("scripts/dnet/dnet.js", server);
                ns.scp("scripts/dnet/phishing.js", server);
                ns.scp("scripts/config.js", server);
            }
            if (overwrite) {
                ns.exec("scripts/dnet/dnet.js", server, { preventDuplicates: true }, "o");
            } else {
                ns.exec("scripts/dnet/dnet.js", server, { preventDuplicates: true });
            }
        }
    }
    return;
}

export async function main(ns: NS) {
    const overwrite = ns.args[0] === "o";
    ns.tprint(overwrite);
    const localhost = ns.getHostname();
    if (localhost === "home") {
        ns.clearPort(DNET_SWEEP_PORT);
        const sweep = new Set<string>();
        sweep.add("home");
        ns.writePort(DNET_SWEEP_PORT, sweep);
    }
    if (!WasVisited(ns, localhost)) {
        for (const file of ns.ls(localhost)) {
            if (!file.includes(".js") && !file.includes(".cache")) {
                ns.tprint(file);
                ns.scp(file, "home", localhost);
            }
        }
    }
    for (const cache of ns.ls(localhost, ".cache")) {
        ns.dnet.openCache(cache);
    }
    AddVisitedNode(ns, localhost);
    if (localhost !== "home") {
        const threads = Math.floor((ns.getServerMaxRam(localhost) - 8) / ns.getScriptRam("scripts/dnet/phishing.js"));
        if (threads < Number.POSITIVE_INFINITY) {
            ns.exec("scripts/dnet/phishing.js", localhost, { threads: threads, preventDuplicates: true })
        }
    }
    await Propagate(ns, overwrite);
}

