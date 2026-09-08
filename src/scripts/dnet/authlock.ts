import { NS } from "@ns";
import { AUTH_LOCK_PORT } from "../config";

/**
 * Records that a darknet agent is currently attacking a victim server.
 *
 * @remarks
 * Stored in the {@link AUTH_LOCK_PORT} port so other scripts can tell which
 * agent/victim pairs are already being worked, and by which running process.
 */
export type AuthLock = {
    pid: number,
    agent: string,
    victim: string
}

/**
 * Builds an {@link AuthLock} for an agent/victim pair, if the lock would be valid.
 *
 * @remarks
 * Validates that both `agent` and `victim` are online (via {@link NS.dnet.getServerDetails})
 * and that `pid` refers to a script that is still running, before constructing the lock.
 *
 * @param ns - Netscript API object.
 * @param pid - Process ID of the script that will hold the lock.
 * @param agent - Hostname of the darknet agent performing the attack.
 * @param victim - Hostname of the server being attacked.
 * @returns The new {@link AuthLock}, or `undefined` if `agent`/`victim` are offline
 * or `pid` does not correspond to a running script.
 */
export function CreateAuthLock(ns: NS, pid: number, agent: string, victim: string): AuthLock | undefined {
    if (ns.dnet.getServerDetails(agent).isOnline === false
        || ns.dnet.getServerDetails(victim).isOnline === false
        || ns.getRunningScript(pid) === null) return undefined;
    const lock: AuthLock = { pid: pid, agent: agent, victim: victim };
    return lock;
}

/**
 * Adds a new authlock for an agent/victim pair to the authlock port.
 *
 * @remarks
 * Builds the lock with {@link CreateAuthLock}, reads the current list of locks off
 * the port with {@link ReadAuthLocks} (which also prunes stale entries), appends the
 * new lock, and writes the result back with {@link SetAuthLocks}.
 *
 * @param ns - Netscript API object.
 * @param pid - Process ID of the script that will hold the lock.
 * @param agent - Hostname of the darknet agent performing the attack.
 * @param victim - Hostname of the server being attacked.
 * @returns `true` if the lock was created and successfully written to the port,
 * `false` if the lock was invalid (see {@link CreateAuthLock}) or the port write failed.
 */
export function AddAuthLock(ns: NS, pid: number, agent: string, victim: string): boolean {
    let lock = CreateAuthLock(ns, pid, agent, victim);
    if (lock === undefined) return false;
    let locks = ReadAuthLocks(ns);
    locks.push(lock);
    return SetAuthLocks(ns, FilterActivePids(ns, locks)); 
}

/**
 * Reads the current list of authlocks without removing them from the port.
 *
 * @remarks
 * Uses {@link NS.peek} so the port's contents are left intact, treating a
 * `"NULL PORT DATA"` result as an empty list. The returned list is passed through
 * {@link FilterActivePids} so locks held by processes that are no longer running
 * are excluded.
 *
 * @param ns - Netscript API object.
 * @returns The current authlocks whose holding process is still running.
 */
export function PeekAuthLocks(ns: NS): Array<AuthLock> {
    let locks = ns.peek(AUTH_LOCK_PORT);
    if (locks === "NULL PORT DATA") {
        locks = new Array<AuthLock>();    
		ns.tryWritePort(AUTH_LOCK_PORT, locks);
    }
    return FilterActivePids(ns, locks);
}

/**
 * Reads and clears the current list of authlocks from the port.
 *
 * @remarks
 * Uses {@link NS.readPort} to pop the port's contents, treating a
 * `"NULL PORT DATA"` result as an empty list, then calls {@link NS.clearPort} to
 * leave the port empty. Callers that only want to inspect the locks without
 * consuming them should use {@link PeekAuthLocks} instead. The returned list is
 * passed through {@link FilterActivePids} so locks held by processes that are no
 * longer running are excluded.
 *
 * @param ns - Netscript API object.
 * @returns The authlocks that were on the port, whose holding process is still running.
 */
export function ReadAuthLocks(ns: NS): Array<AuthLock> {
    let locks = ns.readPort(AUTH_LOCK_PORT);
    if (locks === "NULL PORT DATA") {
        locks = new Array<number>();    
    } else {
    	ns.clearPort(AUTH_LOCK_PORT);
	}
    return FilterActivePids(ns, locks);
}

/**
 * Removes authlocks whose holding process is no longer running.
 *
 * @remarks
 * A lock's `pid` is considered stale once {@link NS.getRunningScript} returns `null`
 * for it, which happens if the script that created the lock has exited without
 * releasing it.
 *
 * @param ns - Netscript API object.
 * @param locks - Authlocks to check.
 * @returns Only the locks whose `pid` still corresponds to a running script.
 */
export function FilterActivePids(ns: NS, locks: Array<AuthLock>): Array<AuthLock> {
    return locks.filter((x) => ns.getRunningScript(x.pid) !== null);
}

/**
 * Overwrites the authlock port with the given list of locks.
 *
 * @remarks
 * Clears the port with {@link NS.clearPort} before writing so no stale entries
 * remain, then writes `locks` (after pruning stale entries with
 * {@link FilterActivePids}) via {@link NS.tryWritePort}.
 *
 * @param ns - Netscript API object.
 * @param locks - Authlocks to store on the port.
 * @returns `true` if the locks were written successfully, `false` otherwise.
 */
export function SetAuthLocks(ns: NS, locks: Array<AuthLock>): boolean {
    ns.clearPort(AUTH_LOCK_PORT);
    return ns.tryWritePort(AUTH_LOCK_PORT, FilterActivePids(ns, locks));
}
