import {NS} from "@ns";
import { Victim } from "./victim";
import { Agent } from "./agent";

export async function main(ns: NS) {
    while (true) {
        var victims_unsorted = Victim.getAllVictims(ns); 
        var victims = Array.from(victims_unsorted).sort((a, b) => a.requiredHackingSkill! - b.requiredHackingSkill!);
        var agents_unsorted = Agent.getAllAgents(ns);
        var agents = Array.from(agents_unsorted).sort((a, b) => b.openRAM() - a.openRAM());
        for (const victim of victims) {
            if (Victim.isBeingAttacked(ns, victim)) continue;
            if (victim.isPrepped()) {
                for (const agent of agents) {
                    if (agent.hostname === "home" && agent.openRAM() < 64) continue;
                    if (agent.doHack(ns, victim, true) > 0) break;
                }
                continue;
            }
            if (victim.getSecurityDiff() > 0) {
                for (const agent of agents) {
                    if (agent.hostname === "home" && agent.openRAM() < 64) continue;
                    var pid = agent.doWeaken(ns, victim, true);
                    if (pid > 0) break;
                }
                continue;
            }
            if (victim.getMoneyMult() > 1) {
                for (const agent of agents) {
                    if (agent.hostname === "home" && agent.openRAM() < 64) continue;
                    if (agent.doGrow(ns, victim, true) > 0) break;
                }
                continue;
            }
        }
        await ns.sleep(3000);
    } 
}