import {
  confirm as inquirerConfirm,
  input as inquirerInput,
  password as inquirerPassword,
  select as inquirerSelect,
} from "@inquirer/prompts";

let autoMode = false;

export function setAutoMode(enabled: boolean): void {
  autoMode = enabled;
}

export function isAutoMode(): boolean {
  return autoMode;
}

type InputOpts = Parameters<typeof inquirerInput>[0];
type ConfirmOpts = Parameters<typeof inquirerConfirm>[0];
type PasswordOpts = Parameters<typeof inquirerPassword>[0];
type SelectOpts<Value> = Parameters<typeof inquirerSelect<Value>>[0];

export async function input(opts: InputOpts): Promise<string> {
  if (autoMode) return (opts.default ?? "").toString();
  return inquirerInput(opts);
}

export async function confirm(opts: ConfirmOpts): Promise<boolean> {
  if (autoMode) return opts.default ?? false;
  return inquirerConfirm(opts);
}

export async function password(opts: PasswordOpts): Promise<string> {
  if (autoMode) return "";
  return inquirerPassword(opts);
}

export async function select<Value>(opts: SelectOpts<Value>): Promise<Value> {
  if (autoMode) {
    if (opts.default !== undefined) return opts.default as Value;
    const firstChoice = opts.choices[0] as { value: Value } | Value;
    return typeof firstChoice === "object" &&
      firstChoice !== null &&
      "value" in firstChoice
      ? firstChoice.value
      : (firstChoice as Value);
  }
  return inquirerSelect<Value>(opts);
}
