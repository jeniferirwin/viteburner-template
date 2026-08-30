import {NS} from "@ns";
import { RemoveAuthLock, SudoAuthenticate, SudoHeartbleed } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    let bleed;
    do {
        bleed = await SudoHeartbleed(ns, server);
        await ns.dnet.nextMutation();
    } while (bleed !== undefined);
    RemoveAuthLock(ns, server);
}