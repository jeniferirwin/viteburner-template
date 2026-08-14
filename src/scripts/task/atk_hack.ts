import {NS} from "@ns";
import { RegisterTarget, UnregisterTarget} from "@/scripts/daemon/cacher"

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  const padms = ns.args[1] as number;
  RegisterTarget(ns, target);
  const start = performance.now();
  await ns.hack(target, { additionalMsec: padms });
  const end = performance.now();
  // ns.tprintRaw(`Hack vs. ${target} finished: ${end - start}ms ${(end - start) / 1000}s`);
  UnregisterTarget(ns, target);
}