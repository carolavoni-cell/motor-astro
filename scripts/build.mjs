// Monta a pasta dist/ a partir de src/:
//   index.js e index.cjs  para o portal e scripts no Node (astronomy-engine à parte)
//   motor-astro.js        para páginas no navegador, tudo num arquivo só (global MotorAstro)
//   *.d.ts                os tipos, para o TypeScript do portal
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pacote = JSON.parse(fs.readFileSync(path.join(raiz, "package.json"), "utf8"));

fs.writeFileSync(
  path.join(raiz, "src", "versao.ts"),
  `/** Versão do motor (vem do package.json; o build reescreve este arquivo). */\nexport const VERSAO_DO_MOTOR = "${pacote.version}";\n`,
);
fs.rmSync(path.join(raiz, "dist"), { recursive: true, force: true });

const comum = {
  entryPoints: [path.join(raiz, "src", "index.ts")],
  bundle: true,
  target: "es2020",
  legalComments: "inline",
  logLevel: "warning",
};

await esbuild.build({ ...comum, format: "esm", platform: "neutral", external: ["astronomy-engine"], outfile: path.join(raiz, "dist", "index.js") });
await esbuild.build({ ...comum, format: "cjs", platform: "node", external: ["astronomy-engine"], outfile: path.join(raiz, "dist", "index.cjs") });
await esbuild.build({
  ...comum,
  format: "iife",
  platform: "browser",
  globalName: "MotorAstro",
  banner: { js: `/* motor-astro ${pacote.version} · https://github.com/carolavoni-cell/motor-astro · inclui astronomy-engine (MIT, Don Cross) */` },
  // No Node (scripts que carregam este arquivo direto), também vira global.
  footer: { js: "if (typeof globalThis !== 'undefined') globalThis.MotorAstro = MotorAstro;" },
  outfile: path.join(raiz, "dist", "motor-astro.js"),
});

// "motor-astro/completo": o mesmo motor, com as tabelas da NASA carregadas (só Node). O arquivo das tabelas vai junto.
const completo = { ...comum, entryPoints: [path.join(raiz, "src", "completo.ts")], external: ["astronomy-engine"], logOverride: { "empty-import-meta": "silent" } };
await esbuild.build({ ...completo, format: "esm", platform: "node", define: { __MOTOR_CJS__: "false" }, outfile: path.join(raiz, "dist", "completo.js") });
await esbuild.build({ ...completo, format: "cjs", platform: "node", define: { __MOTOR_CJS__: "true" }, outfile: path.join(raiz, "dist", "completo.cjs") });
fs.copyFileSync(path.join(raiz, "dados", "efemerides-de440.bin"), path.join(raiz, "dist", "efemerides-de440.bin"));

execFileSync(process.execPath, [path.join(raiz, "node_modules", "typescript", "bin", "tsc"), "-p", raiz], { stdio: "inherit" });
console.log(`motor-astro ${pacote.version}: dist/ pronta.`);
