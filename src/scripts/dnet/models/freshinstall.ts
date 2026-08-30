import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    let password;
    if (details.passwordLength === 4 && details.passwordFormat === "alphabetic") password = "root";
    if (details.passwordLength === 4 && details.passwordFormat === "numeric") password = "0000";
    if (details.passwordLength === 5 && details.passwordFormat === "alphabetic") password = "admin";
    if (details.passwordLength === 8) password = "password";
    if (password !== undefined) {
        var auth = await SudoAuthenticate(ns, server, password);
        if (auth.success) RegisterDnetServer(ns, server, password);
    } else {
        for (const pw of ["12345", "00000", "1234"]) {
            auth = await SudoAuthenticate(ns, server, pw);
            if (auth.success) {
                RegisterDnetServer(ns, server, pw);
                break;
            }
        }
    }
    RemoveAuthLock(ns, server);
}
