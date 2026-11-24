import { casosDeMapa, casosDePrevisao, ESTADOS, instantesDaLua, instantesDaTabela } from "./casos.mjs";

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

  const previsao = casosDePrevisao().map((c) => previsaoDoCaso(M, c, mapas.find((m) => m.nome === c.mapa).mapa));

  return JSON.parse(JSON.stringify({ mapas, lua, lunacoes, luaNasCasas, tabela, fusos, previsao }));
}

/**
 * Um caso de previsão: tudo o que o módulo de previsão calcula para um mapa
 * e um período. As datas saem em ISO e os graus com seis casas.
 */
function previsaoDoCaso(M, caso, mapa) {
  const DIA = 86_400_000;
  const de = new Date(caso.de + "T12:00:00Z");
  const ate = new Date(caso.ate + "T12:00:00Z");
  const planetas = ["Sol", "Mercúrio", "Vênus", "Marte", "Júpiter", "Saturno", "Urano", "Netuno", "Plutão"];
  const alvos = mapa.pontos.filter((p) => !["Nodo Sul", "Lilith"].includes(p.nome)).map((p) => ({ nome: p.nome, lon: p.lon }));
  const pares = planetas.flatMap((p1, i) => planetas.slice(i + 1).map((p2) => [p1, p2]));
  const nascimento = new Date(mapa.instanteUtc);
  const sol = mapa.pontos.find((p) => p.nome === "Sol").lon;
  const amostras = M.amostrasDoCeu(new Date(de.getTime() - 10 * DIA), new Date(ate.getTime() + 10 * DIA), planetas);
  const idade = M.idadeNaData(mapa.instanteUtc.slice(0, 10), de);
  const r = {
    nome: `${caso.mapa} de ${caso.de} a ${caso.ate}`,
    transitos: M.transitosSobrePontos({ amostras, transitantes: planetas, alvos, orbe: 3, janela: { de, ate } }),
    ceu: M.aspectosNoCeu({ amostras, pares, limite: 3, de, ate }),
    mudancas: M.mudancasDeCasaESigno({ amostras, transitantes: planetas, cuspides: mapa.cuspides, de, ate }),
    estacoes: M.estacoesDosPlanetas({ amostras, transitantes: planetas.slice(1) }),
    tocados: M.pontosTocados(amostras[0].lon.Sol, alvos, M.ANGULOS_MAIORES, 3),
    fimDaFaseCheia: M.fimDaFaseCheia(de),
    retornoSolar: M.retornoSolar(sol, de, 200),
    idade,
    profeccao: M.profeccaoAnual(idade, mapa.asc),
    casaInteiraDoSol: M.casaPorSignosInteiros(sol, mapa.asc),
    instanteProgredido: M.instanteProgredido(nascimento, de),
    luaProgredida: M.ceuProgredido(nascimento, de).longitudes.get("Lua"),
    faseDaLunacao: M.faseDaLunacao(sol, M.ceuProgredido(nascimento, de).longitudes.get("Lua")),
    mudancasProgredidas: M.mudancasProgredidas({ nascimento, corpos: ["Lua", "Sol"], cuspides: mapa.cuspides, de, ate: new Date(de.getTime() + 400 * DIA) }),
    fasesProgredidas: M.mudancasDeFaseProgredida({ nascimento, de, ate: new Date(de.getTime() + 1500 * DIA) }),
    aspectosProgredidos: M.aspectosProgredidos({ nascimento, corpos: ["Lua", "Sol"], alvos, de, ate: new Date(de.getTime() + 200 * DIA) }),
  };
  return JSON.parse(JSON.stringify(r, (_, v) => (typeof v === "number" ? Number(v.toFixed(6)) : v)));
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
