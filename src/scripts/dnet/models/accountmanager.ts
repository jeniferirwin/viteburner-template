import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    for (var i = 0; i <= 10; i++) {
        if (!ns.dnet.getServerDetails(server).isOnline) break;
        const auth = await SudoAuthenticate(ns, server, i.toString());
        if (auth.success) {
            RegisterDnetServer(ns, server, i.toString());
            break;
        }
    }
    RemoveAuthLock(ns, server);
}
