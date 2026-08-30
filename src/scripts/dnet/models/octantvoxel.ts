import {NS} from "@ns";
import { RegisterDnetServer, RemoveAuthLock, SudoAuthenticate } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    let auth;
    if (details.data.length === 0) {
        RemoveAuthLock(ns, server);
        return;
    }
    const info = details.data.split(",");
    const base = parseInt(info[0]);
    var numeric = parseInt(info[1], base);
    if (base > 0) {
        auth = await SudoAuthenticate(ns, server, numeric.toString());
        if (auth === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        if (auth.success) {
            RegisterDnetServer(ns, server, numeric.toString());
            RemoveAuthLock(ns, server);
        }
    }
    const number = numeric.toString();
    ns.tprintRaw(`base: ${base} number: ${number}`);
    var result = 0;
    var exponent = number.length - 1;
    for (var i = 0; i < number.length; i++) {
        const temp = parseInt(number[i]) * (base ** exponent);
        result += temp;
        ns.tprintRaw(`${parseInt(number[i])} * (${base} ** ${exponent}) = ${temp} (total ${result})`);
        exponent--;
    }
    const password = result.toString();
    ns.tprintRaw(`trying ${password} on octant`);
    auth = await SudoAuthenticate(ns, server, password);
    if (auth === undefined) {
        RemoveAuthLock(ns, server);
        return;
    }
    if (auth.success) {
        RegisterDnetServer(ns, server, password);
    } else {
        const heartbleed = await ns.dnet.heartbleed(server);
        ns.tprintRaw(heartbleed.logs[0]);
    }
    RemoveAuthLock(ns, server);
}




