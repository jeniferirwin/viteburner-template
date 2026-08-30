import {NS} from "@ns";
import { HeartbleedLogLine, RegisterDnetServer, RemoveAuthLock, SudoAuthenticate, SudoHeartbleed } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    const chars = details.passwordLength; 
    const pattern = `${server}:(\\d{${chars},${chars}})`;
    ns.tprintRaw(pattern);
    const re = new RegExp(pattern);
    var auth = await SudoAuthenticate(ns, server, "");
    while (auth !== undefined && auth.code !== 200) {
        const bleed = await SudoHeartbleed(ns, server);
        if (bleed === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        const data: HeartbleedLogLine = JSON.parse(bleed.logs[0]);
        ns.tprint(data.data);
        var match = re.exec(data.data ?? "");
        if (match !== null && match.groups !== null && match.groups !== undefined) {
            ns.tprintRaw(match.groups[1]);
        }
        await ns.sleep(0);
    }
    RemoveAuthLock(ns, server);
}