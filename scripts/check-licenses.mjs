#!/usr/bin/env node
/**
 * Fails when a production dependency has a copyleft licence (GPL, LGPL, AGPL, SSPL).
 * An "A OR B" expression passes when one alternative is not copyleft.
 */
import { execFileSync } from "node:child_process";

const COPYLEFT = /\b(A?GPL|LGPL|SSPL)/i;

const raw = execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const byLicence = JSON.parse(raw);

function isBlocked(expression) {
  const alternatives = expression.replace(/[()]/g, "").split(/\s+OR\s+/i);
  return alternatives.every((alt) => COPYLEFT.test(alt));
}

const blocked = [];
let count = 0;
for (const [licence, packages] of Object.entries(byLicence)) {
  for (const pkg of packages) {
    count += 1;
    if (isBlocked(licence))
      blocked.push(`${pkg.name}@${(pkg.versions ?? []).join(",")}: ${licence}`);
  }
}

console.log(
  `Checked ${count} production packages. Licences: ${Object.keys(byLicence).sort().join(", ")}`,
);
if (blocked.length > 0) {
  console.error(
    `Copyleft licences found in production dependencies:\n${blocked.map((b) => `  - ${b}`).join("\n")}`,
  );
  process.exit(1);
}
console.log("No GPL, LGPL, AGPL or SSPL licence in production dependencies.");
