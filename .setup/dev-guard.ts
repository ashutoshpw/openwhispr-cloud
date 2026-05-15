#!/usr/bin/env bun
import { colors } from "../scripts/lib/colors";

console.log("");
console.log(`${colors.yellow}${colors.bold}  ⚠  Setup required${colors.reset}`);
console.log("");
console.log(
  `  Please run ${colors.cyan}bun run setup${colors.reset} before ${colors.cyan}bun run dev${colors.reset}`,
);
console.log("");
process.exit(1);
