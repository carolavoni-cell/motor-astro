import { casosDeMapa, ESTADOS, instantesDaLua, instantesDaTabela } from "./casos.mjs";

/**
 * Roda todos os casos do gabarito num motor e devolve o resultado em JSON.
 * Recebe o motor como parâmetro para que a mesma conta sirva para o motor
 * central e, uma única vez, para o cálculo antigo do portal (de onde saiu
 * o esperado.json).
 */
export function montarResultado(M) {
  const mapas = casosDeMapa().map((c) => {
    const zona = c.modo === "zona" ? (c.zona ?? M.zonaDoLocal(c.uf, c.dados.longitude).zona) : null;
    const { calculadoEm: _, ...mapa } = M.calcularMapa({ ...c.dados, zona });
    return { nome: c.nome, mapa };
  });

  const instantes = instantesDaLua();
  const lua = instantes.map((t) => ({ t, fase: M.faseDaLua(new Date(t)) }));
  const lunacoes = instantes.slice(0, 12).map((t) => ({ t, lista: M.proximasLunacoes(6, new Date(t)) }));

  const luaNasCasas = mapas
    .filter((m) => m.mapa.cuspides)
    .slice(0, 20)
    .map((m, i) => {
      const t = instantes[i];
      const r = M.luaNasCasas(m.mapa.cuspides, new Date(t));
      return { nome: m.nome, t, ...r, ate: r.ate ? r.ate.toISOString() : null };
    });

  const tabela = instantesDaTabela().map((t) => ({ t, lon: M.longitudeDaTabela(M.ABUNDANTIA, new Date(t)) }));

  const fusos = ESTADOS.map((uf) => ({
    uf,
    fusoPadrao: M.fusoPadraoPorUf(uf),
    verao2010: M.tinhaHorarioDeVerao(2010, 12, 15, uf),
    verao1990: M.tinhaHorarioDeVerao(1990, 1, 15, uf),
  }));

  return JSON.parse(JSON.stringify({ mapas, lua, lunacoes, luaNasCasas, tabela, fusos }));
}

/** JSON com um caso por linha, para o histórico mostrar só o que mudou. */
export function escreverGabarito(r) {
  const chaves = Object.keys(r);
  const linhas = ["{"];
  chaves.forEach((k, i) => {
    const fim = i < chaves.length - 1 ? "," : "";
    const v = r[k];
    if (!Array.isArray(v)) return linhas.push(`${JSON.stringify(k)}: ${JSON.stringify(v)}${fim}`);
    linhas.push(`${JSON.stringify(k)}: [`);
    v.forEach((x, j) => linhas.push(`  ${JSON.stringify(x)}${j < v.length - 1 ? "," : ""}`));
    linhas.push(`]${fim}`);
  });
  linhas.push("}");
  return linhas.join("\n") + "\n";
}
