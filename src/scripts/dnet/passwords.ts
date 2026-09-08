import {NS} from "@ns";
import { DNET_SERVER_PORT } from "../config";

export type RegistryEntry = {
    agent: string,
    password: string
}

export function CreateRegistryEntry(agent: string, password: string) {
    let entry: RegistryEntry = { agent: agent, password: password };
    return entry;
}

export function RegisterDnetServer(ns: NS, agent: string, password: string): boolean {
    if (ns.dnet.getServerDetails(agent).isOnline === false) return false;
    if (!ns.dnet.connectToSession(agent, password).success) return false;
}


export function GetDnetRegistry(ns: NS) {
    let registry = ns.readPort(DNET_SERVER_PORT);
    if (registry === "NULL PORT DATA") {
        registry = new Array<RegistryEntry>();
    }
}