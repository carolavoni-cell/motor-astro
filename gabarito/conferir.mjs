// Confere o motor contra o gabarito: os mesmos casos precisam dar
// exatamente os mesmos números de esperado.json. Rodar com `npm test`.
//
// Confere as três formas do motor (Node ESM, Node CommonJS e o arquivo do
// navegador), porque cada projeto usa uma delas.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { montarResultado } from "./resultado.mjs";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const esperado = JSON.parse(fs.readFileSync(path.join(aqui, "esperado.json"), "utf8"));

const formas = {
  "Node (import)": await import("../dist/index.js"),
  "Node (require)": createRequire(import.meta.url)("../dist/index.cjs"),
  navegador: (() => {
    const caixa = { Intl, Date, Math };
    vm.createContext(caixa);
    vm.runInContext(fs.readFileSync(path.join(aqui, "..", "dist", "motor-astro.js"), "utf8"), caixa);
    return caixa.MotorAstro;
  })(),
};

let falhas = 0;
for (const [nome, motor] of Object.entries(formas)) {
  const obtido = montarResultado(motor);
  const diferencas = [];
  for (const parte of ["mapas", "lua", "lunacoes", "luaNasCasas", "tabela", "fusos"]) {
    esperado[parte].forEach((item, i) => {
      const a = JSON.stringify(item);
      const b = JSON.stringify(obtido[parte][i]);
      if (a !== b) diferencas.push(`${parte} #${i + 1}${item.nome ? ` (${item.nome})` : ""}`);
    });
  }
  if (diferencas.length) {
    falhas++;
    console.log(`✗ ${nome}: ${diferencas.length} casos diferentes do gabarito. Primeiros: ${diferencas.slice(0, 8).join(", ")}`);
  } else {
    console.log(`✓ ${nome}: motor ${motor.VERSAO_DO_MOTOR} igual ao gabarito em ${esperado.mapas.length} mapas e todos os demais casos.`);
  }
}

if (falhas) {
  console.log("\nO motor mudou algum resultado. Se a mudança foi de propósito (regra nova aprovada pela Carol), atualize o gabarito; se não, corrija o motor.");
  process.exit(1);
}
