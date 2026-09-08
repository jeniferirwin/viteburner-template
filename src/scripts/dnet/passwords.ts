import {NS} from "@ns";
import { DNET_SERVER_PORT } from "../config";

/**
 * Records a known password for a darknet agent.
 *
 * @remarks
 * Stored in the {@link DNET_SERVER_PORT} port so other scripts can log back
 * into an agent without re-cracking it.
 */
export type RegistryEntry = {
    agent: string,
    password: string
}

/**
 * Builds a {@link RegistryEntry} for an agent/password pair.
 *
 * @param agent - Hostname of the darknet agent.
 * @param password - Password known to authenticate with `agent`.
 * @returns The new {@link RegistryEntry}.
 */
export function CreateRegistryEntry(agent: string, password: string) {
    let entry: RegistryEntry = { agent: agent, password: password };
    return entry;
}

/**
 * Adds a new password entry for a darknet agent to the registry port.
 *
 * @remarks
 * Verifies that `agent` is online and that `password` actually authenticates
 * a session (via {@link NS.dnet.connectToSession}) before recording it.
 * Builds the entry with {@link CreateRegistryEntry}, reads the current
 * registry with {@link GetDnetRegistry} (which also prunes offline servers),
 * appends the new entry, and writes the result back to the port.
 *
 * @param ns - Netscript API object.
 * @param agent - Hostname of the darknet agent to register.
 * @param password - Password to store for `agent`.
 * @returns `true` if the password was verified and successfully written to
 * the port, `false` if `agent` is offline, `password` failed to authenticate,
 * or the port write failed.
 */
export function RegisterDnetServer(ns: NS, agent: string, password: string): boolean {
    if (!ns.dnet.getServerDetails(agent).isOnline ||
    	!ns.dnet.connectToSession(agent, password).success) return false;
	let entry = CreateRegistryEntry(agent, password);
	let registry: Array<RegistryEntry> = GetDnetRegistry(ns);
	registry.push(entry);
	return ns.tryWritePort(DNET_SERVER_PORT, registry);
}


/**
 * Reads and clears the current registry of known darknet passwords from the port.
 *
 * @remarks
 * Uses {@link NS.readPort} to pop the port's contents, treating a
 * `"NULL PORT DATA"` result as an empty registry, then calls
 * {@link NS.clearPort} to leave the port empty. The returned list is passed
 * through {@link FilterActiveServers} so entries for agents that have gone
 * offline are excluded.
 *
 * @param ns - Netscript API object.
 * @returns The registry entries that were on the port, whose agent is still online.
 */
export function GetDnetRegistry(ns: NS): Array<RegistryEntry> {
    let registry = ns.readPort(DNET_SERVER_PORT);
    if (registry === "NULL PORT DATA") {
        registry = new Array<RegistryEntry>();
    } else {
		ns.clearPort(DNET_SERVER_PORT);
	}
	return FilterActiveServers(ns, registry);
}

/**
 * Removes registry entries for darknet agents that are no longer online.
 *
 * @remarks
 * An entry is considered stale once {@link NS.dnet.getServerDetails} reports
 * its agent as offline.
 *
 * @param ns - Netscript API object.
 * @param registry - Registry entries to check.
 * @returns Only the entries whose agent is still online.
 */
export function FilterActiveServers(ns: NS, registry: Array<RegistryEntry>) {
	return registry.filter((x) => ns.dnet.getServerDetails(x.agent).isOnline);
}