import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    var upper = "";
    var lower = "1";
    for (var i = 0; i < details.passwordLength; i++) {
        upper += "9";
        if (i > 0) lower += "0";
    }
    for (var j = Number(lower); j <= Number(upper); j++) {
        const auth = await SudoAuthenticate(ns, server, String(j));
        if (auth !== undefined && auth.success === true) {
            RegisterDnetServer(ns, server, String(j));
            break;
        }
    }
    RemoveAuthLock(ns, server);
}