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
  for (const parte of ["mapas", "lua", "lunacoes", "luaNasCasas", "tabela", "fusos", "previsao"]) {
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
    console.log(`✓ ${nome}: motor ${motor.VERSAO_DO_MOTOR} igual ao gabarito em ${esperado.mapas.length} mapas, ${esperado.previsao.length} casos de previsão e todos os demais casos.`);
  }
}

// Modo completo (tabelas da NASA): confere o que o gabarito acima não vê. Roda por último, porque as tabelas valem para o programa inteiro.
// De 2020 a 2035 o total de estações tem de ser o da Swiss Ephemeris, e nenhum planeta pode ter duas estações coladas:
// a versão 1.2.1 criava estações falsas quando um planeta passava atrás do Sol.
{
  const completo = await import("../dist/completo.js");
  const T = ["Mercúrio", "Vênus", "Marte", "Júpiter", "Saturno", "Urano", "Netuno", "Plutão"];
  const amostras = completo.amostrasDoCeu(new Date("2020-01-01T12:00:00Z"), new Date("2036-01-01T12:00:00Z"), T);
  const est = completo.estacoesDosPlanetas({ amostras, transitantes: T });
  let coladas = 0;
  for (const p of T) {
    const l = est.filter((e) => e.transitante === p).map((e) => e.quando.getTime()).sort((a, b) => a - b);
    for (let i = 1; i < l.length; i++) if (l[i] - l[i - 1] < 15 * 86400000) coladas++;
  }
  const TOTAL = 292; // contado com a Swiss Ephemeris (arquivos completos) em 26/11/2026
  if (completo.precisaoDoMotor() !== "completa" || coladas || est.length !== TOTAL) {
    falhas++;
    console.log(`✗ modo completo: precisão ${completo.precisaoDoMotor()}, ${est.length} estações de 2020 a 2035 (esperado ${TOTAL}), ${coladas} coladas uma na outra.`);
  } else console.log(`✓ modo completo: tabelas carregadas, ${est.length} estações de 2020 a 2035 (igual à Swiss Ephemeris), nenhuma falsa.`);
  completo.removerEfemerides();
}

if (falhas) {
  console.log("\nO motor mudou algum resultado. Se a mudança foi de propósito (regra nova aprovada pela Carol), atualize o gabarito; se não, corrija o motor.");
  process.exit(1);
}
