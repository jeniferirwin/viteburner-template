import {NS} from "@ns";
import { RegisterTarget, UnregisterTarget} from "@/scripts/daemon/cacher"

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  const padms = ns.args[1] as number;
  const start = performance.now();
  RegisterTarget(ns, target);
  const result = await ns.weaken(target, { additionalMsec: padms });
  const end = performance.now();
  // ns.tprintRaw(`Weaken vs. ${target} finished: ${end - start}ms ${(end - start) / 1000}s (Result: ${result})`);
  UnregisterTarget(ns, target);
}