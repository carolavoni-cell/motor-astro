// Monta dados/efemerides-de440.bin a partir da efeméride da NASA (JPL DE440, arquivo de440s.bsp).
// Os dados do JPL são públicos. O arquivo .bsp (32 MB) não fica no repositório: baixe de
// https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp e passe o caminho.
// Uso: node scripts/montar-efemerides.mjs <caminho/de440s.bsp> [anoInicial=1900] [anoFinal=2100]
//
// O .bsp guarda, para cada corpo, polinômios de Chebyshev da posição (km, eixos ICRF) em intervalos fixos.
// Aqui só se recorta o período e se troca o formato: os dois primeiros coeficientes de cada eixo ficam em 64 bits
// e os demais em 32 bits (erro menor que 1 km nos planetas e que 10 m na Lua), o que reduz o arquivo a menos da metade.
// A Terra em relação ao baricentro Terra-Lua não é guardada: sai da Lua, pela razão de massas (EMRAT).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [arq, anoIni = "1900", anoFim = "2100"] = process.argv.slice(2);
if (!arq) { console.error("uso: node scripts/montar-efemerides.mjs <de440s.bsp> [anoInicial] [anoFinal]"); process.exit(2); }
const J2000 = Date.UTC(2000, 0, 1, 12);
const etDe = (ano, fimDoAno) => (Date.UTC(Number(ano) + (fimDoAno ? 1 : 0), 0, 1) - J2000) / 1000;
const ET_INI = etDe(anoIni, false) - 40 * 86400, ET_FIM = etDe(anoFim, true) + 40 * 86400; // folga de 40 dias de cada lado
const EMRAT = 81.3005682214972154; // razão de massas Terra/Lua do DE440

const buf = fs.readFileSync(arq), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
if (buf.subarray(0, 7).toString("latin1") !== "DAF/SPK") { console.error("não é um arquivo SPK"); process.exit(1); }
const nd = dv.getInt32(8, true), ni = dv.getInt32(12, true), tam = nd * 8 + ni * 4;
const segs = [];
for (let rec = dv.getInt32(76, true); rec;) {
  const base = (rec - 1) * 1024, n = dv.getFloat64(base + 16, true);
  for (let i = 0; i < n; i++) {
    const o = base + 24 + i * tam, fimB = dv.getInt32(o + 36, true) * 8;
    segs.push({ alvo: dv.getInt32(o + 16, true), centro: dv.getInt32(o + 20, true), tipo: dv.getInt32(o + 28, true), off: (dv.getInt32(o + 32, true) - 1) * 8,
      init: dv.getFloat64(fimB - 32, true), intlen: dv.getFloat64(fimB - 24, true), rsize: dv.getFloat64(fimB - 16, true), n: dv.getFloat64(fimB - 8, true) });
  }
  rec = dv.getFloat64(base, true);
}
// [id no arquivo final, alvo, centro]: baricentros dos planetas, o Sol, o baricentro Terra-Lua e a Lua em relação a ele
const QUERO = [[1, 1, 0], [2, 2, 0], [3, 3, 0], [4, 4, 0], [5, 5, 0], [6, 6, 0], [7, 7, 0], [8, 8, 0], [9, 9, 0], [10, 10, 0], [301, 301, 3]];
const blocos = [], cab = { fonte: "JPL DE440 (de440s.bsp), dados publicos da NASA", emrat: EMRAT, etIni: ET_INI, etFim: ET_FIM, segs: [] };
let pos = 0;
for (const [id, alvo, centro] of QUERO) {
  const s = segs.find((x) => x.alvo === alvo && x.centro === centro);
  if (!s || s.tipo !== 2) { console.error(`segmento ${alvo}/${centro} ausente ou de outro tipo`); process.exit(1); }
  const nc = (s.rsize - 2) / 3, i0 = Math.max(0, Math.floor((ET_INI - s.init) / s.intlen)), i1 = Math.min(s.n - 1, Math.floor((ET_FIM - s.init) / s.intlen)), n = i1 - i0 + 1;
  const A = new Float64Array(n * 6), B = new Float32Array(n * 3 * (nc - 2));
  for (let i = 0; i < n; i++) {
    const o = s.off + (i0 + i) * s.rsize * 8 + 16; // pula MID e RADIUS (saem de init e intlen)
    for (let k = 0; k < 3; k++) for (let j = 0; j < nc; j++) {
      const c = dv.getFloat64(o + (k * nc + j) * 8, true);
      if (j < 2) A[i * 6 + k * 2 + j] = c; else B[(i * 3 + k) * (nc - 2) + (j - 2)] = c;
    }
  }
  const bytesB = Math.ceil(B.byteLength / 8) * 8;
  cab.segs.push({ id, init: s.init + i0 * s.intlen, intlen: s.intlen, n, nc, offA: pos, offB: pos + A.byteLength });
  blocos.push(Buffer.from(A.buffer), Buffer.concat([Buffer.from(B.buffer), Buffer.alloc(bytesB - B.byteLength)]));
  pos += A.byteLength + bytesB;
}
let json = Buffer.from(JSON.stringify(cab), "utf8");
json = Buffer.concat([json, Buffer.alloc((8 - ((12 + json.length) % 8)) % 8, 0x20)]);
const cabecalho = Buffer.alloc(12); cabecalho.write("MAJPL001", "latin1"); cabecalho.writeUInt32LE(json.length, 8);
const saida = path.join(raiz, "dados", "efemerides-de440.bin");
fs.writeFileSync(saida, Buffer.concat([cabecalho, json, ...blocos]));
console.log(`ok: ${saida} · ${(fs.statSync(saida).size / 1e6).toFixed(1)} MB · ${anoIni} a ${anoFim} · ${cab.segs.map((s) => `${s.id}:${s.n}x${s.nc}`).join(" ")}`);
