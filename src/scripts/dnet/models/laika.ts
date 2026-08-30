import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    let password, auth;
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    if (details.passwordLength === 3) password = "max";
    if (details.passwordLength === 5) password = "rover";
    if (password !== undefined) {
        auth = await SudoAuthenticate(ns, server, password);
        if (auth === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        if (auth.success) {
            RegisterDnetServer(ns, server, password);
            RemoveAuthLock(ns, server);
            return;
        }
    }
    for (const pw of ["fido", "spot"]) {
        auth = await SudoAuthenticate(ns, server, pw);
        if (auth === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        if (auth.success){
            RegisterDnetServer(ns, server, pw);
            break;
        }
    }
    RemoveAuthLock(ns, server);
}