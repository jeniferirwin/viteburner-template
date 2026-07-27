import {NS} from "@ns";

export async function main(ns: NS, target: string = ns.getHostname()) {
  if (ns.args.length > 0) {
    target = ns.args[0].toString();
  }
  var results = await ns.weaken(target);
  ns.tprintRaw(`[${target}] ${results} weakened`);
}