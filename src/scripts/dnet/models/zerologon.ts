import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const auth = await SudoAuthenticate(ns, server, "");
    if (auth.success) RegisterDnetServer(ns, server, "");
    RemoveAuthLock(ns, server);
}