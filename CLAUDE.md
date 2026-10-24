# motor-astro: instruções para o Claude

Este é o motor de cálculo ÚNICO dos projetos de astrologia da Carol Avoni.
A Carol não é programadora e fala português: explique em linguagem simples
e confirme antes de passos importantes. Leia o `LEIA-ME.md` antes de mexer.

## Regras
- Todo cálculo astrológico mora aqui. Nenhum projeto mantém cópia própria
  do cálculo; se encontrar uma, avise a Carol em vez de corrigir a cópia.
- Repositório PÚBLICO: nunca colocar dados de clientes, textos de leitura,
  chaves ou senhas.
- `npm run pronto` precisa passar antes de qualquer commit.
- Mudança que altera resultado só com aprovação da Carol; então
  `npm run gabarito:novo`, subir `VERSAO_DO_MAPA` e a versão do pacote.
- Sempre subir a versão em `package.json`, marcar a tag `vX.Y.Z` e enviar
  com `git push --follow-tags`. Nunca mudar o que uma tag já publicada
  aponta: os projetos dependem dela.
- `dist/` vai para o Git (os projetos usam direto do GitHub). Não editar à mão.
- Depois de publicar, atualizar a versão em cada projeto da tabela
  "Quem usa" do LEIA-ME, conferir cada um e atualizar a tabela.
