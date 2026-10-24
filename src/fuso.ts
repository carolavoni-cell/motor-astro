/**
 * Fuso horário e horário de verão.
 *
 * Correção de 2026-10-16: a regra fixa anterior (verão do primeiro domingo
 * de novembro ao terceiro de fevereiro, numa lista fixa de estados) errava
 * centenas de dias por estado, porque as datas e os estados participantes
 * mudaram quase todo ano. Agora a hora local é convertida pela base de
 * fusos IANA, que vem embutida no Node e no navegador com todo o histórico
 * brasileiro. Exemplos que a regra antiga errava: São Paulo 20/10/2005
 * (tinha verão), São Paulo 01/12/2019 (não tinha), Salvador 01/12/2011
 * (tinha), Recife 01/12/1999 (tinha).
 */

const ZONA_POR_UF: Record<string, string> = {
  AC: "America/Rio_Branco", AL: "America/Maceio", AP: "America/Belem", AM: "America/Manaus",
  BA: "America/Bahia", CE: "America/Fortaleza", DF: "America/Sao_Paulo", ES: "America/Sao_Paulo",
  GO: "America/Sao_Paulo", MA: "America/Fortaleza", MT: "America/Cuiaba", MS: "America/Campo_Grande",
  MG: "America/Sao_Paulo", PA: "America/Belem", PB: "America/Fortaleza", PR: "America/Sao_Paulo",
  PE: "America/Recife", PI: "America/Fortaleza", RJ: "America/Sao_Paulo", RN: "America/Fortaleza",
  RS: "America/Sao_Paulo", RO: "America/Porto_Velho", RR: "America/Boa_Vista", SC: "America/Sao_Paulo",
  SP: "America/Sao_Paulo", SE: "America/Maceio", TO: "America/Araguaina",
};

export type ZonaDoLocal = { zona: string | null; aproximada: boolean };

/**
 * Zona IANA pelo estado e pela longitude. Amazonas (oeste: Eirunepé), Pará
 * (oeste: Santarém) e Pernambuco (Fernando de Noronha) têm mais de uma zona;
 * nos dois primeiros a divisa é aproximada e o resultado vem marcado.
 * Fora do Brasil, devolve zona nula: aí vale o fuso informado à mão.
 */
export function zonaDoLocal(uf?: string | null, longitude?: number | null): ZonaDoLocal {
  const u = (uf ?? "").toUpperCase();
  const lon = longitude ?? -47;
  if (!ZONA_POR_UF[u]) return { zona: null, aproximada: false };
  if (u === "AM" && lon < -67.5) return { zona: "America/Eirunepe", aproximada: true };
  if (u === "PA" && lon < -54.0) return { zona: "America/Santarem", aproximada: true };
  if (u === "PE" && lon > -33.0) return { zona: "America/Noronha", aproximada: false };
  return { zona: ZONA_POR_UF[u], aproximada: u === "AM" || u === "PA" };
}

/** Diferença da zona para UTC, em minutos, num instante (ms UTC). */
function deslocamentoMin(zona: string, ms: number): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const v = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return Math.round(
    (Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second) - ms) / 60000,
  );
}

export type AvisoDeHora = "repetida" | "inexistente";

/**
 * Converte a hora local para UTC pela zona IANA. Detecta a hora que não
 * existiu (início do horário de verão) e a hora que se repetiu (fim do
 * horário de verão); na repetida, usa a primeira ocorrência (ainda no verão).
 */
export function instanteNaZona(
  o: { ano: number; mes: number; dia: number; hora: number; minuto: number },
  zona: string,
): { instante: Date; deslocamentoHoras: number; horarioDeVerao: boolean; aviso: AvisoDeHora | null } {
  const local = Date.UTC(o.ano, o.mes - 1, o.dia, o.hora, o.minuto, 0);
  const candidatos = [
    ...new Set([deslocamentoMin(zona, local - 43_200_000), deslocamentoMin(zona, local + 43_200_000)]),
  ];
  const validos = candidatos
    .filter((d) => deslocamentoMin(zona, local - d * 60000) === d)
    .sort((a, b) => b - a);
  let deslocamento: number;
  let aviso: AvisoDeHora | null = null;
  if (validos.length === 1) {
    deslocamento = validos[0];
  } else if (validos.length > 1) {
    deslocamento = validos[0];
    aviso = "repetida";
  } else {
    deslocamento = Math.min(...candidatos);
    aviso = "inexistente";
  }
  // Horário padrão = o menor deslocamento do ano (o horário de verão sempre adianta).
  // Vale para os dois hemisférios: no Brasil o verão é em janeiro, na Europa em julho.
  const padrao = Math.min(deslocamentoMin(zona, Date.UTC(o.ano, 0, 15, 15)), deslocamentoMin(zona, Date.UTC(o.ano, 6, 15, 15)));
  return {
    instante: new Date(local - deslocamento * 60000),
    deslocamentoHoras: deslocamento / 60,
    horarioDeVerao: deslocamento > padrao,
    aviso,
  };
}

/** Havia horário de verão nesta data e neste local? (consulta à base IANA) */
export function tinhaHorarioDeVerao(
  ano: number,
  mes: number,
  dia: number,
  uf?: string | null,
  longitude?: number | null,
): boolean {
  const { zona } = zonaDoLocal(uf, longitude);
  if (!zona) return false;
  return instanteNaZona({ ano, mes, dia, hora: 12, minuto: 0 }, zona).horarioDeVerao;
}

/**
 * Instante exato (UTC) com fuso fixo informado à mão (cidades fora do
 * Brasil ou correção manual). fusoHoras é negativo no Brasil (-3 em
 * Brasília); o horário de verão adianta o relógio em 1 hora.
 */
export function instanteDoNascimento(opcoes: {
  ano: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  fusoHoras: number;
  horarioDeVerao?: boolean;
}): Date {
  const deslocamento = opcoes.fusoHoras + (opcoes.horarioDeVerao ? 1 : 0);
  const minutosUtc = opcoes.hora * 60 + opcoes.minuto - deslocamento * 60;
  return new Date(Date.UTC(opcoes.ano, opcoes.mes - 1, opcoes.dia, 0, minutosUtc, 0));
}

/** A zona IANA existe na base de fusos do servidor? */
export function zonaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

/**
 * Para cidades fora do Brasil: converte a zona escolhida no fuso padrão e no
 * horário de verão da data e hora de nascimento, que é o que o banco guarda
 * (fuso_horas e horario_verao). Sem hora, usa o meio-dia.
 */
export function fusoParaGravar(
  zona: string,
  dataIso: string,
  hora: string | null,
): { fuso_horas: number; horario_verao: boolean } {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const [h, m] = (hora ?? "12:00").split(":").map(Number);
  const r = instanteNaZona({ ano, mes, dia, hora: h, minuto: m }, zona);
  return {
    fuso_horas: r.deslocamentoHoras - (r.horarioDeVerao ? 1 : 0),
    horario_verao: r.horarioDeVerao,
  };
}

/** Fuso padrão de hoje para o estado, em horas (só para exibição). Fora do Brasil, -3. */
export function fusoPadraoPorUf(uf?: string | null): number {
  const { zona } = zonaDoLocal(uf, -47);
  if (!zona) return -3;
  return deslocamentoMin(zona, Date.UTC(2026, 6, 15, 15)) / 60;
}
