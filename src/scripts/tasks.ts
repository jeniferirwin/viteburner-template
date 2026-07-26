import {ScriptArg, NS} from "@ns";
import { Globals } from "./globals";

export enum TaskType {
    WEAKEN,
    GROW,
    HACK
}

export class TaskAssignment {
    pid: number = -1;

    protected constructor(
        public type: TaskType,
        public args?: ScriptArg[]
    ) {}

    taskLaunched() {
        return this.pid > -1;
    }

    static create(type: TaskType, args?: ScriptArg[]): TaskAssignment | undefined {
        return new TaskAssignment(type, args);
    }
}
export class AttackAssignment extends TaskAssignment {
    private agent: string = "";

    protected constructor(
        public ns: NS,
        public type: TaskType,
        public victim: string
    ) {
        super(type);
    }

    static createAttack(ns: NS, type: TaskType, victim: string): AttackAssignment | undefined {
        if (!AttackAssignment.validateVictim(ns, victim)) return undefined;
        return new AttackAssignment(ns, type, victim);
    }

    start(ns: NS) {
        if (this.taskLaunched()) return;
        // TODO
    }

    private getTaskScript(ns: NS): string | undefined {
        switch (this.type) {
            case TaskType.WEAKEN:
                return Globals.scriptWeaken;
            case TaskType.GROW:
                return Globals.scriptGrow;
            case TaskType.HACK:
                return Globals.scriptHack;
            default:
                return undefined;
        }
    }

    private static validateVictim(ns: NS, victim: string): boolean {
        if (ns.serverExists(victim) && ns.hasRootAccess(victim)) return true;
        return false;
    }

    public assignAgent(ns: NS, hostname: string): boolean {
        if (!ns.serverExists(hostname)) return false;
        var script = this.getTaskScript(ns) ?? "";
        if (!ns.fileExists(script, hostname)) {
            return false;
        }
        this.agent = hostname;
        return true;
    }

    private static validateThreads(threads: number): boolean {
        if (threads > 0) return true;
        return false;
    }
}
