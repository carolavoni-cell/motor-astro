# Motor de cálculo astrológico (motor-astro)

Um só motor para todos os projetos de astrologia da Carol Avoni. Ele só
calcula: posições, casas, aspectos, fuso e horário de verão, Lua e
lunações e, desde a versão 1.1.0, a previsão (trânsitos, céu do dia,
ingressos, estações, retorno solar, profecção e progressões). Textos, telas
e dados de clientes ficam em cada projeto.

Este repositório é público: aqui entra só a matemática. **Nunca** colocar
aqui dados de clientes, textos de leitura ou chaves de acesso.

## Quem usa

| Projeto | Onde está a referência ao motor | Versão em uso |
|---|---|---|
| Portal do Acompanhamento | `portal/package.json`, linha `"motor-astro"` | v1.1.0 |
| Mapa do dinheiro | `package.json` da raiz, linha `"motor-astro"` (o `gerador/pacote_fatos.cjs` lê o motor instalado) | v1.1.0 |
| Planner 2027 | `package.json` da raiz, linha `"motor-astro"` (quem chama é o `cerebro/inventario.mjs`, pela entrada `motor-astro/completo`) | v1.2.1 |

Quando um projeto novo passar a usar o motor, acrescente uma linha aqui.

## Como um projeto usa o motor

**Projeto com Node (como o portal).** No `package.json`:

```json
"motor-astro": "github:carolavoni-cell/motor-astro#v1.2.1"
```

e no código:

```ts
import { calcularMapa, zonaDoLocal } from "motor-astro";
```

**Página HTML (como o Mapa do dinheiro).** Uma linha antes dos outros scripts:

```html
<script src="https://cdn.jsdelivr.net/gh/carolavoni-cell/motor-astro@v1.1.0/dist/motor-astro.js"></script>
```

Depois disso, tudo fica em `MotorAstro` (por exemplo
`MotorAstro.calcularMapa(...)`). O arquivo já traz o astronomy-engine dentro.
A página precisa de internet para carregar o motor.

**Nunca apontar um projeto para esta pasta do computador** (por exemplo
`../motor-astro/dist`). A pasta pode estar à frente da versão publicada, e
o projeto mudaria de resultado sem ninguém conferir. Sempre a versão
publicada, com o número.

O número depois de `#` ou `@` é a versão. Cada projeto escolhe a sua: uma
versão nova do motor não muda nada num projeto até alguém trocar esse número
lá e conferir.

## Como mudar o motor

1. Mudar o código em `src/`.
2. Rodar `npm run pronto`, que monta o motor e confere o gabarito.
   - Se o gabarito acusar diferença e a mudança **não** era para mudar
     resultado, o erro está na mudança: corrigir.
   - Se a mudança era para mudar resultado (regra nova aprovada pela Carol,
     correção conferida no Solar Fire), rodar `npm run gabarito:novo`,
     olhar as diferenças e subir `VERSAO_DO_MAPA` em `src/mapa.ts` (o
     portal recalcula os mapas guardados quando esse número muda).
3. Subir a versão em `package.json` (1.0.0 → 1.1.0; correção pequena que
   não muda resultado nenhum → 1.0.1) e rodar `npm run pronto` de novo.
4. Guardar no Git, marcar a versão e enviar:
   `git commit`, `git tag v1.1.0`, `git push --follow-tags`.
5. Em cada projeto da tabela acima: trocar o número da versão, conferir o
   projeto e atualizar a tabela.

## Efeméride da NASA (desde a 1.2.0)

Em novembro de 2026 a validação da agenda do Planner mostrou que o motor 1.1.0
diferia da Swiss Ephemeris (a régua do Solar Fire) em 10 a 20 segundos de
arco. Num mapa natal isso não aparece, mas deslocava o horário de trânsitos
em minutos ou horas e chegou a trocar o dia de um evento. As causas eram
três: a teoria encurtada dos planetas do astronomy-engine, a correção de
tempo (ΔT) por fórmula e a conta do Nodo. A versão 1.2.0 corrige as três.

- **Tabelas da NASA.** `dados/efemerides-de440.bin` (9 MB, 1900 a 2100) tem
  as posições do JPL DE440, a mesma base da Swiss Ephemeris. Os dados do JPL
  são públicos. Quem monta o arquivo é `scripts/montar-efemerides.mjs`, a
  partir do `de440s.bsp` baixado do site do JPL (o .bsp não fica aqui).
- **Dois modos.** `motor-astro/completo` (só Node: servidor do Portal,
  Planner) carrega as tabelas e deve ser usado sempre que o resultado tiver
  data e hora de evento. `motor-astro` sem as tabelas (páginas no navegador)
  continua com o astronomy-engine: serve para mapa natal, não para horário de
  evento. `precisaoDoMotor()` diz em que modo o programa está.

  ```ts
  import { ceuNoInstante, precisaoDoMotor } from "motor-astro/completo";
  ```

  Basta importar de `motor-astro/completo` uma vez, no começo do programa: o
  que for importado de `motor-astro` depois, no mesmo programa, já usa as
  tabelas.
- **ΔT por tabela** (`src/deltat.ts`), com os valores medidos e a projeção
  da Swiss Ephemeris. Vale nos dois modos.
- **Instante exato até o segundo** (`refinarInstante`), lunações na mesma
  convenção do Solar Fire e estação pelo sentido do movimento no instante.
- **Como foi medido** (600 datas de 1900 a 2100, contra a Swiss Ephemeris
  com os arquivos completos): planetas, Sol e Lua a 0,007 segundo de arco em
  média e 0,03 no máximo; Nodo Norte a 0,3 no máximo. Nos eventos de 2027,
  aspectos e lunações a até 1 segundo; estações de planetas lentos a até 6
  minutos (perto da estação o planeta quase não anda). No modo sem tabelas a
  média fica entre 0,5 e 9 segundos de arco, conforme o planeta.
- **1.2.1:** a entrada `completo` acha o arquivo das tabelas pela pasta do próprio motor em qualquer ambiente (a 1.2.0 errava a pasta quando existia um `__dirname` global). Nenhum resultado muda. Em projeto com empacotador (Next.js), deixar o `motor-astro` fora do pacote do servidor (`serverExternalPackages`), para o Node achar o arquivo.
- **A Swiss Ephemeris não entra no motor** (licença AGPL ou paga). Ela é só
  a régua de conferência, no computador da Carol.

## Previsão (desde a 1.1.0)

`src/previsao.ts` calcula o céu em movimento sobre um mapa. Veio do Planner
2027, onde os aspectos foram conferidos nos relatórios dinâmicos do Solar
Fire. Devolve datas e graus com precisão total: o fuso de exibição, o
arredondamento, o que entra no produto e o texto são de cada projeto.

- `amostrasDoCeu`: o céu dia a dia num período, base das buscas abaixo.
- `transitosSobrePontos`: cada trânsito de um planeta sobre um ponto do
  mapa, com entrada e saída da orbe no minuto, as passagens exatas, a menor
  distância e a menor distância dentro de uma janela (o ano, por exemplo).
  Sextil, quadratura e trígono são buscados nos dois sentidos.
- `aspectosNoCeu`: aspectos exatos entre os planetas do céu (céu do dia).
- `mudancasDeCasaESigno`: quando um planeta muda de casa no mapa e de signo.
- `estacoesDosPlanetas`: quando um planeta para e muda de sentido.
- `pontosTocados`: que pontos do mapa um grau toca (lunação, estação).
- `fimDaFaseCheia`: quando a Lua chega a 225° do Sol.
- `retornoSolar`, `idadeNaData`, `profeccaoAnual`, `casaPorSignosInteiros`.
- Progressões secundárias (um dia por ano trópico): `instanteProgredido`,
  `ceuProgredido`, `faseDaLunacao`, `mudancasProgredidas`,
  `mudancasDeFaseProgredida`, `aspectosProgredidos`.

## O gabarito

`gabarito/` tem 246 mapas de teste (datas de 1930 a 2030, capitais de todos
os estados e cidades de fora do Brasil, com e sem hora, fuso automático e
manual, horas de troca do horário de verão), 40 fases da Lua, lunações com
eclipses, a Lua passando pelas casas, a tabela da Abundantia e o fuso de cada
estado. O `esperado.json` saiu do cálculo do portal e do Mapa do dinheiro em
2026-10-24, antes de o motor ser separado: é o que os dois projetos já
mostravam. Os dois casos de previsão entraram com a versão 1.1.0, depois de
o Planner 2027 dar o mesmo resultado com o cálculo antigo dele e com o
motor. Nenhum caso usa dado de cliente.

## Convenções (decididas pela Carol)

- Zodíaco tropical da data, como no Solar Fire.
- Casas topocêntricas (Polich-Page). Sem hora de nascimento: sem casas,
  sem Ascendente, sem Fortuna.
- Nodo verdadeiro; Lilith média (Meeus); Quíron fora por enquanto.
- Parte da Fortuna com inversão noturna: de dia Asc + Lua − Sol; de noite
  Asc + Sol − Lua.
- Aspectos maiores com a tabela de orbes da astrologia psicológica:
  oposição aos ângulos até 5°; com Ascendente ou Meio do Céu vale a menor
  orbe; Sol e Lua têm prioridade nos demais; Nodos, Lilith, Fortuna e
  asteroides com 2°; aspecto fora de signo conta.
- Fuso e horário de verão pela base de fusos IANA, com todo o histórico
  brasileiro; fuso manual quando informado.
- Posições exibidas com os minutos cortados, sem arredondar.
- Fase da Lua pelo calendário brasileiro: cada fase começa no momento exato.

## Arquivos

- `src/`: o código do motor.
- `dist/`: o motor montado, que os projetos usam (não editar à mão; sai do
  `npm run build`).
- `gabarito/`: os casos de teste e o resultado esperado.
- `scripts/`: montagem do motor e do gabarito.
