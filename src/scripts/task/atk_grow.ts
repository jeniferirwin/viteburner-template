import {NS} from "@ns";
import { RegisterTarget, UnregisterTarget } from "../lib/targets";

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  const padms = ns.args[1] as number;
  RegisterTarget(ns, target);
  const start = performance.now();
  await ns.grow(target, { additionalMsec: padms });
  const end = performance.now();
  ns.tprintRaw(`Grow vs. ${target} finished: ${end - start}ms ${(end - start) / 1000}s`);
  UnregisterTarget(ns, target);
}