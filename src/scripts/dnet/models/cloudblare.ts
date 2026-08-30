import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    const re = /\d/g;
    const match = details.data.matchAll(re);
    if (match !== null) {
        var password = "";
        for (const char of match) password += char;
        const auth = await SudoAuthenticate(ns, server, password);
        if (auth.success) RegisterDnetServer(ns, server, password);
    }
    RemoveAuthLock(ns, server);
}