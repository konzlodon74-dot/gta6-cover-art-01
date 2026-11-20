// Neon Coast Cover Lab — the program that hands the entry in (Node 22,
// standard library only). The app itself is the static site under app/;
// this file copies app/ and screenshots/ into the output directory and
// writes dossier.json there with the kit's vendored dossier library, so
// the judge reads exactly the files that sit beside this one.
//
// Run it locally the way the grader does, with a stand-in output dir:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoDir = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, "app"), join(outputDir, "app"), { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
const shotsDir = join(repoDir, "screenshots");
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, "screenshots"), { recursive: true });
}

// The gate's caps, from the competition's rules: the dossier text is
// capped, screenshots are at most 4 files of 256 KiB, and app/ holds at
// most 993 entries and 48 MiB with no path over 1,000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);
console.log(`handed in app/ and screenshots/ with a ${dossier.length}-byte dossier.json`);
