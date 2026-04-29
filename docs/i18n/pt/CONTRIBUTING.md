> 🤖 Este documento foi traduzido por máquina do inglês. Melhorias via PR são bem-vindas — consulte o [guia de contribuição de tradução](../README.md).

# Contribuindo com o Lore Context

Obrigado por melhorar o Lore Context. Este projeto é um plano de controle de contexto
para agentes de IA em estágio alpha, portanto as alterações devem preservar a operação
local-first, a auditabilidade e a segurança de implantação.

## Código de Conduta

Este projeto segue o [Contributor Covenant](../../../CODE_OF_CONDUCT.md). Ao participar,
você concorda em respeitá-lo.

## Configuração de Desenvolvimento

Requisitos:

- Node.js 22 ou mais recente
- pnpm 10.30.1 (`corepack prepare pnpm@10.30.1 --activate`)
- (Opcional) Docker para o caminho com Postgres
- (Opcional) `psql` se preferir aplicar o schema manualmente

Comandos comuns:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm smoke:api
pnpm smoke:mcp
pnpm smoke:dashboard
pnpm smoke:postgres   # requer docker compose up -d postgres
pnpm run doctor
```

Para trabalho por pacote:

```bash
pnpm --filter @lore/api test
pnpm --filter @lore-context/server test
pnpm --filter @lore/eval test
pnpm --filter @lore/governance test
pnpm --filter @lore/mif test
pnpm --filter @lore/agentmemory-adapter test
```

## Expectativas para Pull Requests

- **Mantenha as alterações focadas e reversíveis.** Uma preocupação por PR; um PR por
  preocupação.
- **Adicione testes** para mudanças de comportamento. Prefira asserções reais a snapshots.
- **Execute `pnpm build` e `pnpm test`** antes de solicitar revisão. O CI também os
  executa, mas localmente é mais rápido.
- **Execute o teste de fumaça relevante** ao alterar comportamento de API, dashboard, MCP,
  Postgres, importação/exportação, eval ou implantação.
- **Não faça commit** de saída de build gerada, armazenamentos locais, arquivos `.env`,
  credenciais ou dados privados de clientes. O `.gitignore` cobre a maioria dos caminhos;
  se você criar novos artefatos, certifique-se de que estejam excluídos.
- **Mantenha-se dentro do escopo do seu PR.** Não refatore código não relacionado de
  passagem.

## Guardrails Arquiteturais

Estes são não negociáveis para v0.4.x. Se um PR violar algum, espere uma solicitação
para dividir ou retrabalhar:

- **Local-first permanece primário.** Um novo recurso deve funcionar sem um serviço
  hospedado ou dependência de SaaS de terceiros.
- **Nenhuma nova superfície de autenticação com bypass.** Toda rota permanece protegida
  por chave de API + papel. Loopback não é um caso especial em produção.
- **Nenhuma exposição bruta do `agentmemory`.** Chamadores externos alcançam a memória
  apenas através dos endpoints do Lore.
- **Integridade do log de auditoria.** Toda mutação que afeta o estado da memória grava
  uma entrada de auditoria.
- **Falha fechada em configuração faltante.** A inicialização em modo produção recusa
  começar se as variáveis de ambiente obrigatórias forem placeholders ou estiverem
  ausentes.

## Mensagens de Commit

O Lore Context usa um formato de commit pequeno e opinativo inspirado nas diretrizes do
kernel Linux.

### Formato

```text
<type>: <resumo curto no modo imperativo>

<corpo opcional explicando por que essa mudança é necessária e quais trade-offs se aplicam>

<trailers opcionais>
```

### Tipos

- `feat` — nova capacidade visível ao usuário ou endpoint de API
- `fix` — correção de bug
- `refactor` — reestruturação de código sem mudança de comportamento
- `chore` — higiene do repositório (dependências, tooling, movimentação de arquivos)
- `docs` — apenas documentação
- `test` — apenas mudanças em testes
- `perf` — melhoria de desempenho com impacto mensurável
- `revert` — reversão de um commit anterior

### Estilo

- **Minúsculas** no tipo e na primeira palavra do resumo.
- **Sem ponto final** na linha de resumo.
- **≤72 caracteres** na linha de resumo; quebre o corpo em 80.
- **Modo imperativo**: "fix loopback bypass", não "fixed" ou "fixes".
- **Por quê, não o quê**: o diff mostra o que mudou; o corpo deve explicar o porquê.
- **Não inclua** trailers `Co-Authored-By`, atribuição de IA ou linhas signed-off-by,
  a menos que sejam explicitamente exigidos pelo usuário.

### Trailers Úteis

Quando relevante, adicione trailers para capturar restrições e contexto do revisor:

```text
Constraint: Public deployments must keep /health unauthenticated for uptime checks
Confidence: high
Scope-risk: narrow
Tested: pnpm test, pnpm smoke:api
Not-tested: Cloudflare Access integration
Closes: #123
```

### Exemplo

```text
fix: loopback bypass — remove host-header trust, fail closed in production

Previous versions trusted the Host header for loopback detection, allowing a
remote attacker to spoof "Host: 127.0.0.1" and obtain admin role with no API
key when LORE_API_KEYS was unset. Loopback detection now uses
req.socket.remoteAddress only, and production with empty keys returns 401.

Constraint: Local development without keys still works on loopback
Confidence: high
Scope-risk: narrow (auth path only)
Tested: pnpm test (added loopback-bypass test case), pnpm smoke:api
```

## Granularidade de Commits

- Uma mudança lógica por commit. Revisores podem reverter atomicamente sem
  danos colaterais.
- Faça squash de correções triviais (`typo`, `lint`, `prettier`) no commit pai
  antes de abrir ou atualizar um PR.
- Refatorações em múltiplos arquivos estão corretas em um único commit se
  compartilharem um único motivo.

## Processo de Revisão

- Um mantenedor revisará seu PR em até 7 dias durante a atividade típica.
- Endereça todos os comentários bloqueantes antes de solicitar revisão novamente.
- Para comentários não bloqueantes, responder inline com justificativa ou uma issue
  de acompanhamento é aceitável.
- Mantenedores podem adicionar um label `merge-queue` uma vez que o PR seja aprovado;
  não faça rebase nem force-push depois que esse label for aplicado.

## Traduções de Documentação

Se você gostaria de melhorar um README traduzido ou arquivo de documentação, consulte o
[guia de contribuição i18n](../README.md).

## Reportando Bugs

- Abra uma issue pública em https://github.com/Lore-Context/lore-context/issues
  a menos que o bug seja uma vulnerabilidade de segurança.
- Para problemas de segurança, siga [SECURITY.md](../../../SECURITY.md).
- Inclua: versão ou commit, ambiente, reprodução, esperado vs. atual,
  logs (com conteúdo sensível redigido).

## Agradecimentos

O Lore Context é um projeto pequeno tentando fazer algo útil para a infraestrutura de
agentes de IA. Cada PR bem delimitado o faz avançar.
