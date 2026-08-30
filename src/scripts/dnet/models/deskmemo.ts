import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const re = new RegExp(/(\d{1,3})/);
    const match = re.exec(ns.dnet.getServerDetails(server).passwordHint);
    if (match !== null) {
        const password = match[0];
        const auth = await SudoAuthenticate(ns, server, password);
        if (auth === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        if (auth.success) RegisterDnetServer(ns, server, password);
    }
    RemoveAuthLock(ns, server);
}