import {NS, DarknetServerDetails} from "@ns";

export async function ModelHandler(ns: NS, server: string, details: DarknetServerDetails): Promise<boolean> {
    let result;
    switch (details.modelId) {
        case "ZeroLogon":
            result = await ns.dnet.authenticate(server, "");
            break;
    }
    if (result !== undefined) {
        ns.tprintRaw(`${result.code} ${result.data} ${result.message} ${result.success}`);
    } else {
        ns.tprintRaw(`Authentication failed for server ${server}`);
        var msg = await ns.dnet.heartbleed(server);
        ns.tprintRaw(`${msg.code} ${msg.logs} ${msg.message} ${msg.success}`);
    }
}

export async function main(ns: NS) {
    const servers = ns.dnet.probe();
    for (const server of servers) {
        if (ns.dnet.getServerRequiredCharismaLevel(server) <= ns.getPlayer().skills.charisma) {
            const msg = await ns.dnet.heartbleed(server);
            const details = ns.dnet.getServerDetails(server);
            if (!details.isOnline) continue;
            await ModelHandler(ns, server, details);
        }
    }
}