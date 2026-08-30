import {NS} from "@ns";
import { HeartbleedLogLine, RegisterDnetServer, RemoveAuthLock, SudoAuthenticate, SudoHeartbleed } from "../dnet";

export async function main(ns: NS): Promise<void> {
    const server = ns.args[0] as string;
    const details = ns.dnet.getServerDetails(server);
    const numbers = [];
    for (var i = 0; i < details.passwordLength; i++) numbers.push(0);
    var auth = await SudoAuthenticate(ns, server, numbers.join(""));
    if (auth === undefined) {
        RemoveAuthLock(ns, server);
        return;
    }
    while (auth !== undefined && auth.code !== 200) {
        const bleed = await SudoHeartbleed(ns, server);
        if (bleed === undefined) {
            RemoveAuthLock(ns, server);
            return;
        }
        if (bleed.logs[0] !== undefined) {
            const line: HeartbleedLogLine = JSON.parse(bleed.logs[0]);
            if (line.data !== undefined) {
                const feedback = line.data.split(",");
                for (var i = 0; i < feedback.length; i++) {
                    if (feedback[i] === "yesn't") {
                        numbers[i]++;
                        if (numbers[i] === 10) numbers[i] = 0;
                    }
                }
            }
            auth = await SudoAuthenticate(ns, server, numbers.join(""));
        }
    }
    RemoveAuthLock(ns, server);
    if (auth === undefined) return;
    RegisterDnetServer(ns, server, numbers.join(""));
}