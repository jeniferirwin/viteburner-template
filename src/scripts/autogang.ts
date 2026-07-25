import {NS} from "@ns";

export async function main(ns: NS) {
    while (true) {
        for (var memberName of ns.gang.getMemberNames()) {
            var ascension = ns.gang.getAscensionResult(memberName);
            if (ascension === undefined) continue;
            var ascendStats = [ascension.cha, ascension.def, ascension.str, ascension.dex, ascension.hack];
            for (var stat of ascendStats) {
                if (stat >= 1.2) {
                    ns.gang.ascendMember(memberName);
                    ns.tprintRaw(`Ascending ${memberName}`);
                    break;
                }
            }
            var member = ns.gang.getMemberInformation(memberName);
            var mults: [string, number][] = [
                ["cha", member.cha_asc_mult],
                ["hack", member.hack_asc_mult],
                ["str", member.str_asc_mult],
                ["dex", member.dex_asc_mult],
                ["def", member.def_asc_mult],
            ];
            var lowest = mults
                .reduce((min, entry) => (entry[1] > 0 && entry[1] < min[1]) ? entry : min)[0];
            switch (lowest) {
                case "cha":
                    ns.gang.setMemberTask(memberName, "Train Charisma");
                    break;
                case "hack":
                    ns.gang.setMemberTask(memberName, "Train Hacking");
                    break;
                default:
                    ns.gang.setMemberTask(memberName, "Train Combat");
            }
        }
        await ns.gang.nextUpdate();
    }
}