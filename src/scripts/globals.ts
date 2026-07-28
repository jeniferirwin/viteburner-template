export class Globals {
    static scriptPath = "scripts/"
    static scriptHack = this.scriptPath + "atk_hack.js";
    static scriptGrow = this.scriptPath + "atk_grow.js";
    static scriptWeaken = this.scriptPath + "atk_weaken.js";
    static scriptHacknet = this.scriptPath + "hacknet.js";
    static scriptShare = this.scriptPath + "sharing.js";


    static isString(arg: any) {
        if (typeof(arg) === "string") return true;
        return false;
    }

    static isNumber(arg: any) {
        if (typeof(arg) === "number") return true;
        return false;
    }
}