/**
 * Posições pela efeméride da NASA (JPL DE440), a mesma base da Swiss Ephemeris e do Solar Fire.
 *
 * O astronomy-engine usa uma versão encurtada da teoria dos planetas e erra de 10 a 20 segundos de arco
 * (medido contra a Swiss Ephemeris em novembro de 2026). Isso não aparece num mapa natal, mas desloca o
 * horário de um trânsito em minutos ou horas e pode trocar o dia de um evento.
 *
 * Aqui ficam só a leitura e a conta. As tabelas (dados/efemerides-de440.bin, 1900 a 2100, cerca de 9 MB)
 * são montadas por scripts/montar-efemerides.mjs e carregadas por quem usa "motor-astro/completo".
 * Sem as tabelas, ou fora do período delas, o motor continua com o astronomy-engine.
 *
 * As tabelas ficam no objeto global, e não numa variável deste arquivo: assim o motor carregado por
 * "motor-astro" e por "motor-astro/completo" no mesmo programa enxergam as mesmas tabelas.
 */

type Segmento = { init: number; intlen: number; n: number; nc: number; a: Float64Array; b: Float32Array };
type Tabelas = { fonte: string; emrat: number; etIni: number; etFim: number; segs: Map<number, Segmento> };

const CHAVE = "__motorAstroEfemerides";
const global = globalThis as unknown as Record<string, Tabelas | null | undefined>;
const guardadas = (): Tabelas | null => global[CHAVE] ?? null;

const C_KM_S = 299792.458;
/** Número de cada corpo nas tabelas (baricentro do sistema do planeta, como na Swiss Ephemeris). */
export const CORPO_JPL: Record<string, number> = {
  "Mercúrio": 1, "Vênus": 2, "Marte": 4, "Júpiter": 5, "Saturno": 6, "Urano": 7, "Netuno": 8, "Plutão": 9, "Sol": 10,
};

/** Carrega as tabelas (o conteúdo de dados/efemerides-de440.bin). Chamar uma vez, antes de calcular. */
export function instalarEfemerides(bytes: ArrayBuffer | Uint8Array): void {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // cópia alinhada: as tabelas são lidas como números de 64 e de 32 bits
  const buf = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
  const dv = new DataView(buf);
  let marca = "";
  for (let i = 0; i < 8; i++) marca += String.fromCharCode(dv.getUint8(i));
  if (marca !== "MAJPL001") throw new Error("motor-astro: arquivo de efemérides em formato desconhecido");
  const tamanho = dv.getUint32(8, true);
  const cab = new Uint8Array(buf, 12, tamanho);
  let json = "";
  for (let i = 0; i < cab.length; i++) json += String.fromCharCode(cab[i]); // o cabeçalho é gravado só com ASCII
  const c = JSON.parse(json) as {
    fonte: string; emrat: number; etIni: number; etFim: number;
    segs: { id: number; init: number; intlen: number; n: number; nc: number; offA: number; offB: number }[];
  };
  const base = 12 + tamanho;
  const segs = new Map<number, Segmento>();
  for (const s of c.segs) {
    segs.set(s.id, {
      init: s.init, intlen: s.intlen, n: s.n, nc: s.nc,
      a: new Float64Array(buf, base + s.offA, s.n * 6),
      b: new Float32Array(buf, base + s.offB, s.n * 3 * (s.nc - 2)),
    });
  }
  global[CHAVE] = { fonte: c.fonte, emrat: c.emrat, etIni: c.etIni, etFim: c.etFim, segs };
}

/** Tira as tabelas (usado nos testes, para comparar com e sem elas). */
export function removerEfemerides(): void {
  global[CHAVE] = null;
}

/** "completa" quando as tabelas da NASA estão carregadas; "básica" quando só há o astronomy-engine. */
export function precisaoDoMotor(): "completa" | "básica" {
  return guardadas() ? "completa" : "básica";
}

/** As tabelas cobrem este instante? tt em dias desde J2000 (tempo terrestre). Deixa dois dias de folga nas bordas. */
export function efemeridesCobrem(tt: number): boolean {
  const t = guardadas();
  if (!t) return false;
  const et = tt * 86400;
  return et > t.etIni + 2 * 86400 && et < t.etFim - 2 * 86400;
}

/** Posição (km) e velocidade (km/s) de um segmento, nos eixos ICRF, no instante et (segundos desde J2000). */
function estado(seg: Segmento, et: number): number[] {
  let i = Math.floor((et - seg.init) / seg.intlen);
  if (i < 0) i = 0;
  if (i >= seg.n) i = seg.n - 1;
  const raio = seg.intlen / 2;
  const x = (et - (seg.init + (i + 0.5) * seg.intlen)) / raio;
  const m = seg.nc - 2;
  const r = [0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const c0 = seg.a[i * 6 + k * 2], c1 = seg.a[i * 6 + k * 2 + 1];
    // t é o polinômio de Chebyshev e d a derivada dele
    let t0 = 1, t1 = x, d0 = 0, d1 = 1;
    let p = c0 + c1 * x, v = c1;
    const o = (i * 3 + k) * m;
    for (let j = 0; j < m; j++) {
      const t2 = 2 * x * t1 - t0;
      const d2 = 2 * t1 + 2 * x * d1 - d0;
      const c = seg.b[o + j];
      p += c * t2; v += c * d2;
      t0 = t1; t1 = t2; d0 = d1; d1 = d2;
    }
    r[k] = p; r[k + 3] = v / raio;
  }
  return r;
}

const soma = (a: number[], b: number[], f = 1) => a.map((x, i) => x + f * b[i]);

/** Estado em relação ao baricentro do sistema solar. nome: um planeta, "Sol", "Terra" ou "Lua". */
function baricentrico(t: Tabelas, nome: string, et: number): number[] {
  if (nome === "Terra" || nome === "Lua") {
    const emb = estado(t.segs.get(3)!, et), lua = estado(t.segs.get(301)!, et); // a Lua em relação ao baricentro Terra-Lua
    return nome === "Lua" ? soma(emb, lua) : soma(emb, lua, -1 / t.emrat);
  }
  return estado(t.segs.get(CORPO_JPL[nome])!, et);
}

/**
 * Direção aparente de um corpo visto do centro da Terra, nos eixos equatoriais J2000 (os mesmos do astronomy-engine):
 * com o tempo que a luz leva para chegar e a aberração pelo movimento da Terra. tt em dias desde J2000.
 * nome: um planeta, "Sol" ou "Lua". Chamar só quando efemeridesCobrem(tt).
 */
export function direcaoAparente(nome: string, tt: number): [number, number, number] {
  const t = guardadas()!;
  const et = tt * 86400;
  const terra = baricentrico(t, "Terra", et);
  let luz = 0, g = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const c = baricentrico(t, nome, et - luz);
    g = [c[0] - terra[0], c[1] - terra[1], c[2] - terra[2]];
    luz = Math.hypot(g[0], g[1], g[2]) / C_KM_S;
  }
  const d = Math.hypot(g[0], g[1], g[2]);
  let p = [g[0] / d, g[1] / d, g[2] / d];
  if (nome !== "Sol" && nome !== "Lua") {
    // Desvio da luz pela gravidade do Sol: só passa de 0,1 segundo de arco quando o planeta está a poucos graus do Sol.
    const sol = baricentrico(t, "Sol", et);
    const e = [terra[0] - sol[0], terra[1] - sol[1], terra[2] - sol[2]]; // do Sol para a Terra
    const dist = Math.hypot(e[0], e[1], e[2]);
    const q = [g[0] + e[0], g[1] + e[1], g[2] + e[2]]; // do Sol para o planeta
    const dq = Math.hypot(q[0], q[1], q[2]);
    const eu = e.map((x) => x / dist), qu = q.map((x) => x / dq);
    const pq = p[0] * qu[0] + p[1] * qu[1] + p[2] * qu[2];
    const ep = eu[0] * p[0] + eu[1] * p[1] + eu[2] * p[2];
    const qe = qu[0] * eu[0] + qu[1] * eu[1] + qu[2] * eu[2];
    if (1 + qe > 1e-12) {
      const f = (2 * 1.476625 / dist) / (1 + qe); // 2GM/c² do Sol = 2,95 km
      let c = [f * (pq * eu[0] - ep * qu[0]), f * (pq * eu[1] - ep * qu[1]), f * (pq * eu[2] - ep * qu[2])];
      // A fórmula cresce sem limite quando o planeta se alinha atrás do Sol. Na borda do disco solar o desvio é de 1,75
      // segundo de arco: é o teto. Atrás do disco (planeta encoberto) o desvio cai em linha reta até zero no centro,
      // para a posição não dar saltos (a versão 1.2.1 criava estações falsas de Urano em 27/05/2027).
      const TETO = 8.48e-6, BORDA = 4.654e-3; // radianos: 1,75 segundo de arco e o raio aparente do Sol (0,267°)
      const tam = Math.hypot(c[0], c[1], c[2]);
      const elong = Math.acos(Math.max(-1, Math.min(1, -ep)));
      const limite = elong < BORDA ? TETO * (elong / BORDA) : TETO;
      if (tam > limite) c = c.map((x) => x * (limite / tam));
      p = [p[0] + c[0], p[1] + c[1], p[2] + c[2]];
    }
  }
  return [p[0] + terra[3] / C_KM_S, p[1] + terra[4] / C_KM_S, p[2] + terra[5] / C_KM_S];
}

/**
 * Nutação em longitude que falta no astronomy-engine, em graus. Ele usa os 5 maiores termos do modelo IAU 2000B;
 * aqui entram os 15 seguintes (cada um com até 0,07 segundo de arco). A nutação desloca todas as longitudes por igual,
 * então basta somar. tt em dias desde J2000.
 */
export function nutacaoQueFalta(tt: number): number {
  const T = tt / 36525, r = Math.PI / 648000;
  const l = (485868.249036 + 1717915923.2178 * T) * r;   // anomalia média da Lua
  const lp = (1287104.79305 + 129596581.0481 * T) * r;   // anomalia média do Sol
  const F = (335779.526232 + 1739527262.8478 * T) * r;   // argumento da latitude da Lua
  const D = (1072260.70369 + 1602961601.2090 * T) * r;   // elongação da Lua
  const O = (450160.398036 - 6962890.5431 * T) * r;      // nodo da Lua
  const soma =
    -516821 * Math.sin(lp + 2 * F - 2 * D + 2 * O) + 711159 * Math.sin(l) - 387298 * Math.sin(2 * F + O)
    - 301461 * Math.sin(l + 2 * F + 2 * O) + 215829 * Math.sin(-lp + 2 * F - 2 * D + 2 * O) + 128227 * Math.sin(2 * F - 2 * D + O)
    + 123457 * Math.sin(-l + 2 * F + 2 * O) + 156994 * Math.sin(-l + 2 * D) + 63110 * Math.sin(l + O) - 57976 * Math.sin(-l + O)
    - 59641 * Math.sin(-l + 2 * F + 2 * D + 2 * O) - 51613 * Math.sin(l + 2 * F + O) + 45893 * Math.sin(-2 * l + 2 * F + O)
    + 63384 * Math.sin(2 * D) - 38571 * Math.sin(2 * F + 2 * D + 2 * O);
  return soma * 1e-7 / 3600;
}

/** Posição (km) e velocidade (km/s) da Lua em relação ao centro da Terra, eixos equatoriais J2000. */
export function estadoGeocentricoDaLua(tt: number): number[] {
  const t = guardadas()!;
  const lua = estado(t.segs.get(301)!, tt * 86400);
  return lua.map((x) => x * (1 + 1 / t.emrat));
}
