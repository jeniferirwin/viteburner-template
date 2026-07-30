import {NS} from "@ns";
import { Victim } from "./victim";
import { Agent } from "./agent";


export function findHackAgent(ns: NS, victim: Victim, agents: Array<Agent>): boolean {
    for (const agent of agents) {
        if (agent.hostname === "home" && agent.openRAM() < 64) continue;
        if (agent.doHack(ns, victim, false) > 0) return true;
    }
    for (const agent of agents) {
        if (agent.hostname === "home" && agent.openRAM() < 64) continue;
        if (agent.doHack(ns, victim, true) > 0) return true;
    }
    return false;
}

export function findWeakenAgent(ns: NS, victim: Victim, agents: Array<Agent>): boolean {
    for (const agent of agents) {
        if (agent.hostname === "home" && agent.openRAM() < 64) continue;
        if (agent.doWeaken(ns, victim, false) > 0) return true;
    }
    for (const agent of agents) {
        if (agent.hostname === "home" && agent.openRAM() < 64) continue;
        if (agent.doWeaken(ns, victim, true) > 0) return true;
    }
    return false;
}

export function findGrowAgent(ns: NS, victim: Victim, agents: Array<Agent>): boolean {
    for (const agent of agents) {
        if (agent.hostname === "home" && agent.openRAM() < 64) continue;
        if (agent.doGrow(ns, victim, false) > 0) return true;
    }
    for (const agent of agents) {
        if (agent.hostname === "home" && agent.openRAM() < 64) continue;
        if (agent.doGrow(ns, victim, true) > 0) return true;
    }
    return false;
}

export async function main(ns: NS) {
    while (true) {
        var victims = Array.from(Victim.getAllVictims(ns)).sort((a, b) => a.requiredHackingSkill! - b.requiredHackingSkill!);
        var agents = Array.from(Agent.getAllAgents(ns)).sort((a, b) => b.openRAM() - a.openRAM());
        for (const victim of victims) {
            if (Victim.isBeingAttacked(ns, victim)) continue;
            if (victim.isPrepped()) {
                if (findHackAgent(ns, victim, agents) === true) continue;
            }
            if (victim.getSecurityDiff() > 0) {
                if (findWeakenAgent(ns, victim, agents) === true) continue;
            }
            if (victim.getMoneyMult() > 1) {
                if (findGrowAgent(ns, victim, agents) === true) continue;
            }
        }
        await ns.sleep(500);
    } 
}