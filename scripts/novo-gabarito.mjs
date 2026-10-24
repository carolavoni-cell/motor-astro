// Refaz o esperado.json com o motor atual. Só usar quando uma mudança de
// resultado foi DE PROPÓSITO e aprovada pela Carol (regra nova, correção
// conferida no Solar Fire). Rodar com `npm run gabarito:novo`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as motor from "../dist/index.js";
import { escreverGabarito, montarResultado } from "../gabarito/resultado.mjs";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const r = montarResultado(motor);
r.origem = `Motor ${motor.VERSAO_DO_MOTOR}, em ${new Date().toISOString().slice(0, 10)}.`;
fs.writeFileSync(path.join(raiz, "gabarito", "esperado.json"), escreverGabarito(r));
console.log(`Gabarito refeito com o motor ${motor.VERSAO_DO_MOTOR}. Confira as diferenças antes de guardar (git diff gabarito/esperado.json).`);
