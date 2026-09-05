import {NS, DarknetResult, DarknetResponseCode, HeartbleedOptions, DarknetResponseCodeType} from "@ns";
import { AUTH_LOCK_PORT, DNET_SERVER_PORT, SCRIPTS } from "../config";
import { ValidateRegistryData } from "../lib/ports";

export type HeartbleedLogLine = {
    code: DarknetResponseCode,
    message: string,
    data?: string,
    passwordAttempted: string,
}

export class DnetCracker {
    public latestHeartbleed?: DarknetResult & { logs: string[] };
    public latestAuthenticate?: DarknetResult & { data?: any };
    public modelMap: Map<string, Function> = new Map<string, Function>([
    ["AccountsManager", this.CrackAccountManager],
    ["BellaCuore", this.CrackBellaCuore],
    ["CloudBlare", this.CrackCloudBlare],
    ["DeepGreen", this.CrackDeepGreen],
    ["DeskMemo", this.CrackDeskMemo],
    ["Factori", this.CrackFactorios],
    ["FreshInstall", this.CrackFreshInstall],
    ["KingOfTheHill", this.CrackKingOfTheHill],
    ["Labyrinth", this.CrackLabyrinth],
    ["Laika", this.CrackLaika],
    ["NIL", this.CrackNil],
    ["OctantVoxel", this.CrackOctantVoxel],
    ["OpenWebAccess", this.CrackOpenWebAccessPoint],
    ["PHP", this.CrackPHP],
    ["Pr0verFl0", this.CrackPr0verFl0],
    ["RateMyPix", this.CrackRateMyPix],
    ["ZeroLogon", this.CrackZeroLogon]
    ]);

    private constructor(
        public agent: string,
        public victim: string,
        public model: string,
        public passwordHint: string,
        public passwordLength: number,
        public passwordFormat: string,
        public enums: DarknetResponseCodeType) {}

    static Create(ns: NS, victim: string): DnetCracker | undefined {
        const details = ns.dnet.getServerDetails(victim);
        if (!details.isOnline) return undefined;
        if (ns.scriptRunning(SCRIPTS.haxor, victim) || ns.scriptRunning(SCRIPTS.free, victim)) return undefined;
        return new DnetCracker(ns.getHostname(), victim, details.modelId, details.passwordHint, details.passwordLength, details.passwordFormat, ns.enums.DarknetResponseCode);
    }

    async SudoAuthenticate(ns: NS, password: string): Promise<DarknetResult & { data?: any }> {
        let result;
        do { result = await ns.dnet.authenticate(this.victim, password); }
        while (result.code === this.enums.RequestTimeOut);
        this.latestAuthenticate = result;
        if (result.code === this.enums.Success) {
            this.RegisterPassword(ns, password);
        }
        return result;
    }

    async SudoHeartbleed(ns: NS, options?: HeartbleedOptions): Promise<DarknetResult & { logs: string[] }> {
        let result;
        do { result = await ns.dnet.heartbleed(this.victim, options); }
        while (result.code === this.enums.RequestTimeOut);
        this.latestHeartbleed = result;
        return result;
    }

    ShouldGiveUp(result: DarknetResult): boolean {
        if (result.code === this.enums.AuthFailure ||
            result.code === this.enums.RequestTimeOut ||
            result.code === this.enums.Success) return false;
        return true;
    }

    SetAuthLock(ns: NS): boolean {
        if (!this.CanAuth(ns)) return false;
        var locks: Map<string, number> = ns.readPort(AUTH_LOCK_PORT);
        locks.set(this.victim, ns.pid);
        return ns.tryWritePort(AUTH_LOCK_PORT, locks);
    }

    RemoveAuthLock(ns: NS): boolean {
        if (!this.CanAuth(ns)) return false;
        var locks: Map<string, string> = ns.readPort(AUTH_LOCK_PORT);
        locks.delete(this.victim);
        return ns.tryWritePort(AUTH_LOCK_PORT, locks);
    }

    CanAuth(ns: NS): boolean {
        const lock = DnetCracker.GetAuthLock(ns, this.victim);
        if (lock > 0 && lock !== ns.pid) return false;
        return true;
    }

    static GetAuthLock(ns: NS, victim: string): number {
        const registry = ValidateRegistryData<Map<string, number>>(ns, AUTH_LOCK_PORT, Map<string, number>);
        return (registry.get(victim) ?? 0);
    }

    RegisterPassword(ns: NS, password: string): boolean {
        var registry = ValidateRegistryData<Map<string, string>>(ns, DNET_SERVER_PORT, Map<string, string>);
        ns.clearPort(DNET_SERVER_PORT);
        registry.set(this.victim, password);
        return ns.tryWritePort(DNET_SERVER_PORT, registry);
    }

    UnregisterPassword(ns: NS): boolean {
        var registry = ValidateRegistryData<Map<string, string>>(ns, DNET_SERVER_PORT, Map<string, string>);
        registry.delete(this.victim);
        return ns.tryWritePort(DNET_SERVER_PORT, registry);
    }

    async Login(ns: NS): Promise<boolean>  {
        const registry = ValidateRegistryData<Map<string, string>>(ns, DNET_SERVER_PORT, Map<string, string>);
        if (!registry.has(this.victim)) return false;
        let auth = ns.dnet.connectToSession(this.victim, registry.get(this.victim) ?? "");
        if (auth.code !== this.enums.Success) this.UnregisterPassword(ns);
        return auth.success;
    }

    async StartCrack(ns: NS): Promise<boolean> {
        if (!ns.dnet.getServerDetails(this.victim).isOnline) return false;
        for (var [key, value] of this.modelMap) {
            if (this.model.includes(key)) {
                const auth: DarknetResult & { data?: any } = await value.call(this, ns);
                if (auth.code === this.enums.Success) { return true; }
            }
        }
        return false;
    }

    async CrackAccountManager(ns: NS): Promise<boolean> {
        let auth = await this.SudoAuthenticate(ns, "init");
        let bleed = await this.SudoHeartbleed(ns);
        if (this.ShouldGiveUp(auth)) return false;
        const re = /between (\d+) and (\d+)/;
        const match = re.exec(bleed.logs.join());
        if (!match) return false;
        let num: number = (parseInt(match[2]) - parseInt(match[1])) / 2 + parseInt(match[1]);
        while (!this.ShouldGiveUp(auth)) {
            auth = await this.SudoAuthenticate(ns, num.toString());
            bleed = await this.SudoHeartbleed(ns);
            if (auth.success) return true;
            if (bleed && bleed.logs.join().includes("Higher")) {
                num = num + 1;
            } else if (bleed && bleed.logs.join().includes("Lower")) {
                num = num - 1;
            }
        }
        return auth.success;
    }

    async Placeholder(ns: NS): Promise<boolean> {
        let auth, bleed;
        do {
            auth = await this.SudoAuthenticate(ns, "dummypassword");
            bleed = await this.SudoHeartbleed(ns);
            await ns.dnet.nextMutation();
        } while (bleed !== undefined && !this.ShouldGiveUp(auth));
        return true;
    }

    async CrackBellaCuore(ns: NS): Promise<boolean> {
        return false;
    }

    async CrackCloudBlare(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        const re = /\d/g;
        const match = details.data.matchAll(re);
        if (match !== null) {
            var password = "";
            for (const char of match) password += char;
            const auth = await this.SudoAuthenticate(ns, password);
            if (auth.code === this.enums.Success) return true;
        }
        return false;
    }

    async CrackDeepGreen(ns: NS): Promise<boolean> {
        var password: Array<number> = [];
        let auth, bleed;
        do {
            for (var i = 0; i < 10; i++) {
                password.push(i);
                auth = await this.SudoAuthenticate(ns, password.join(""));
                if (auth && auth.success) return true;
                bleed = await this.SudoHeartbleed(ns);
                const re = /(\d),(\d)/;
                const match = re.exec(bleed.logs[0] ?? "");
                if (match) {
                    const exact = parseInt(match[1]);
                    if (exact < password.length) password.pop();
                    else i = -1;
                }
            }
        } while (auth && !this.ShouldGiveUp(auth));
        return false;
    }

    async CrackDeskMemo(ns: NS): Promise<boolean> {
        const re = new RegExp(/(\d{1,3})/);
        const match = re.exec(ns.dnet.getServerDetails(this.victim).passwordHint);
        if (match !== null) {
            const password = match[0];
            const auth = await this.SudoAuthenticate(ns, password);
            if (auth.code === this.enums.Success) return true;
        }
        return false;
    }

    async CrackFactorios(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        var upper = "";
        var lower = "1";
        for (var i = 0; i < details.passwordLength; i++) {
            upper += "9";
            if (i > 0) lower += "0";
        }
        for (var j = Number(lower); j <= Number(upper); j++) {
            const auth = await this.SudoAuthenticate(ns, String(j));
            if (auth.code === this.enums.Success) return true;
        }
        return false;
    }

    async CrackFreshInstall(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        let auth, password;
        if (details.passwordLength === 4 && details.passwordFormat === "alphabetic") password = "root";
        if (details.passwordLength === 5 && details.passwordFormat === "alphabetic") password = "admin";
        if (details.passwordLength === 8) password = "password";
        if (password !== undefined) {
            auth = await this.SudoAuthenticate(ns, password);
        } else {
            for (const pw of ["12345", "00000", "0000", "1234"]) {
                if (details.passwordLength === pw.length) auth = await this.SudoAuthenticate(ns, pw);
            }
        }
        if (auth !== undefined && auth.code === this.enums.Success) return true;
        return false;
    }

    async CrackKingOfTheHill(ns: NS): Promise<boolean> {
        return false;
    }

    async CrackLabyrinth(ns: NS): Promise<boolean> {
        for (var num = 1111; num <= 9999; num++) {
            const result = await this.SudoAuthenticate(ns, `!!the:masterwork:of:daedalus<${num}>!!`);
            if (result.success) return true;
        }
        return false;
    }

    async CrackLaika(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        for (const password of ["fido", "spot", "max", "rover"]) {
            if (details.passwordLength !== password.length) continue;
            const auth = await this.SudoAuthenticate(ns, password);
            if (auth.code === this.enums.Success) return true;
        }
        return false;
    }

    async CrackNil(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        const numbers = [];
        for (var i = 0; i < details.passwordLength; i++) numbers.push(0);
        let auth = await this.SudoAuthenticate(ns, numbers.join(""));
        while (!this.ShouldGiveUp(auth)) {
            const bleed = await this.SudoHeartbleed(ns);
            if (bleed.logs[0] !== undefined) {
                const line: HeartbleedLogLine = JSON.parse(bleed.logs[0]);
                if (line.data !== undefined) {
                    const feedback = line.data.split(",");
                    for (var i = 0; i < feedback.length; i++) {
                        if (feedback[i] === "yesn't") {
                            numbers[i]++;
                            if (numbers[i] === 10) numbers[i] = 0;
                        }
                    }
                }
                auth = await this.SudoAuthenticate(ns, numbers.join(""));
                if (auth.code === this.enums.Success) return true;
            }
        }
        return false;
    }

    async CrackOctantVoxel(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        if (details.data.length === 0) return false;
        const info = details.data.split(",");
        const base = parseInt(info[0]);
        const numeric = parseInt(info[1], base);
        let auth = await this.SudoAuthenticate(ns, numeric.toString());
        if (auth.success) return true;
        return false;
    }

    async CrackOpenWebAccessPoint(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        const chars = details.passwordLength; 
        const re = /:(\\d{${chars},${chars})/;
        var auth = await this.SudoAuthenticate(ns, "");
        while (!this.ShouldGiveUp(auth)) {
            const bleed = await this.SudoHeartbleed(ns);
            ns.tprintRaw(bleed.logs);
            if (bleed === undefined) return false;
            if (bleed !== undefined) {
                var match = re.exec(data.data);
                if (match !== null && match.groups !== null && match.groups !== undefined) {
                    ns.tprint(`match found: ${match.groups}`);
                }
            }
        }
        return true;
    }
    
    async CrackPHP(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        const re = /\d+/g;
        const match = re.exec(details.passwordHint);
        if (match === null) return false;
        var scrambled = Array.from(match[0]);
        const tried = new Set<string>();
        var auth = await this.SudoAuthenticate(ns, scrambled.join(""));
        while (this.ShouldGiveUp(auth) === false) {
            for (let i = scrambled.length - 1; i >= 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
                if (tried.has(scrambled.join(""))) {
                    await ns.sleep(0);
                    continue;
                }
            }
            tried.add(scrambled.join(""));
            auth = await this.SudoAuthenticate(ns, scrambled.join(""));
            if (auth.code === this.enums.Success) return true;
        }
        return false;
    }

    async CrackPr0verFl0(ns: NS): Promise<boolean> {
        const details = ns.dnet.getServerDetails(this.victim);
        const buffer = new Array<number>(details.passwordLength);
        let auth = await this.SudoAuthenticate(ns, buffer.join(""));
        if (auth.data === undefined) {
            ns.tprintRaw("no auth data");
            return false;
        }
        const re = /"passwordExpected":"([^"]*)"/;
        const match = re.exec(auth.data);
        if (!match) ns.tprintRaw("bruh");
        if (match) {
            ns.tprintRaw(`trying ${match[1]}`);
            auth = await this.SudoAuthenticate(ns, match[1]);
            if (auth.code === this.enums.Success) {
                ns.tprintRaw("got it boiii");
                return true;
            }
        }
        return false;
    }

    async CrackRateMyPix(ns: NS): Promise<boolean> {
        return false;
    }

    async CrackZeroLogon(ns: NS): Promise<boolean> {
        const auth = await this.SudoAuthenticate(ns, "");
        return auth.success;
    }

    TargetIsAgent(ns: NS): boolean {
        if (ns.scriptRunning(SCRIPTS.haxor, this.victim) || ns.scriptRunning(SCRIPTS.free)) return true;
        return false;
    }

    PutBundle(ns: NS): void {
        ns.scp(ns.ls(ns.getHostname(), "scripts/"), this.victim, ns.getHostname());
        ns.scp(ns.ls(ns.getHostname(), ".lit"), "home", this.victim);
        ns.scp(ns.ls(ns.getHostname(), ".txt"), "home", this.victim);
        ns.scp(ns.ls(ns.getHostname(), ".js"), "home", this.victim);
        ns.scp(ns.ls(ns.getHostname(), ".ts"), "home", this.victim);
        ns.scp(ns.ls(ns.getHostname(), ".json"), "home", this.victim);
        ns.scp(ns.ls(ns.getHostname(), ".css"), "home", this.victim);
        if (!ns.scriptRunning(SCRIPTS.haxor, this.victim)) {
            const pid = ns.exec(SCRIPTS.free, this.victim);
        }
    }
}

export async function main(ns: NS) {
    if (ns.getHostname() === "home") {
        ns.clearPort(AUTH_LOCK_PORT);
        ns.clearPort(DNET_SERVER_PORT);
    }
    do {
        const caches = ns.ls(ns.getHostname(), ".cache");
        for (var cache of caches) {
            ns.dnet.openCache(cache);
        }
        const servers = ns.dnet.probe();
        for (var server of servers) {
            const cracker = DnetCracker.Create(ns, server);
            if (cracker === undefined) continue;
            if (cracker.TargetIsAgent(ns) || !cracker.SetAuthLock(ns)) continue;
            if (await cracker.Login(ns) || await cracker.StartCrack(ns)) cracker.PutBundle(ns);
            cracker.RemoveAuthLock(ns);
        }
        await ns.dnet.nextMutation();
    } while (true);
}