import { NS } from "@ns";

export function main(ns: NS) {
    var locs = ns.infiltration.getPossibleLocations();
    var data = [];
    for (var loc of locs) {
        data.push(ns.infiltration.getInfiltration(loc.name));
    }
    data.sort((a, b) => a.difficulty - b.difficulty);
    var header = ["CITY", "COMPANY", "BDIFF", "CDIFF", "LV", "REP", "REP/LV"];
    ns.tprint(ns.vsprintf("%-15s %-30s | %5s %5s %2s %8s (%8s)", header));
    for (var chunk of data) {
        var starting = chunk.startingSecurityLevel.toFixed(3);      
        var current = chunk.difficulty.toFixed(3);
        var buf = [chunk.location.city, chunk.location.name, chunk.startingSecurityLevel, chunk.difficulty, chunk.maxClearanceLevel, chunk.reward.tradeRep, chunk.reward.tradeRep / chunk.maxClearanceLevel];
        ns.tprint(ns.vsprintf("%-15s %-30s | %5.2f %5.2f %2d %8.2f (%8.2f)", buf));
    }
    return;
}