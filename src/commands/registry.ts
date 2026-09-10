import type { CmdResult, CommandFn } from "../engine/types";

export const CMDS: Record<string, CommandFn> = {};
export const def = (name: string, fn: CommandFn): void => {
  CMDS[name] = fn;
};

export const O = (t?: string | null): CmdResult => ({ out: t == null ? "" : t, code: 0 });
export const E = (t: string): CmdResult => ({ out: t, code: 1, err: true });
