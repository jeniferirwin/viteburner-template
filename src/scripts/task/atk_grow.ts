import {NS} from "@ns";

export async function main(ns: NS) {
  const target = ns.args[0] as string;
  const padms = ns.args[1] as number;
  const start = performance.now();
  await ns.grow(target, { additionalMsec: padms });
  const end = performance.now();
  ns.tprintRaw(`Grow finished: ${end - start}`);
}