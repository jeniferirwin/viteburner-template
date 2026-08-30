import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    const re = /\d+/g;
    const match = re.exec(details.passwordHint);
    if (match === null) {
        RemoveAuthLock(ns, server);
        return;
    }
    var scrambled = Array.from(match[0]);
    const tried = new Set<string>();
    var auth = await SudoAuthenticate(ns, server, scrambled.join(""));
    while (auth !== undefined && auth.success === false) {
        for (let i = scrambled.length - 1; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
        }
        if (tried.has(scrambled.join(""))) {
            await ns.sleep(0);
            continue;
        }
        tried.add(scrambled.join(""));
        auth = await SudoAuthenticate(ns, server, scrambled.join(""));
        if (auth === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        if ([404, 451, 503].includes(auth.code)) break;
        await ns.sleep(0);
    }
    RegisterDnetServer(ns, server, scrambled.join(""));
    RemoveAuthLock(ns, server);
}
