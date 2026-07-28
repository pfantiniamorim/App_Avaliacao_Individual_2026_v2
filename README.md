# Teste de Seleção de Condutores de Viatura — CBMDF/GBMOT

App web de custo zero para lançamento e apuração em tempo real do teste
prático de direção de viaturas. Até 15 avaliadores marcam penalidades do
mesmo candidato simultaneamente (cada um em sua estação do percurso); o
resultado de cada candidato é a soma de todas as marcações. Tudo fica
auditável na planilha (avaliador, candidato, infração e horário de cada
marcação).

**Stack:** HTML/CSS/JS puro (sem build) + Google Sheets (dados) + Google
Apps Script (API de escrita) + GitHub Pages (hospedagem). Sem dependências
pagas.

## Papéis

- **Avaliador** (`selecao.html` → `avaliacao.html` → `logs.html`): identifica-se
  uma vez, escolhe o candidato atual num seletor e marca as penalidades
  observadas. Sem senha.
- **Chefe da Avaliação** (`participantes.html`, `dashboard.html`,
  `configuracoes.html`): cadastra os candidatos, lança o tempo de prova e
  acompanha o ranking. Protegido por PIN (`js/config.js` → `PIN_CHEFE`).

## Configuração e publicação

Todo o passo a passo (planilha, Apps Script, GitHub Pages) está em
[`CONFIGURAR_PLANILHA.md`](CONFIGURAR_PLANILHA.md).

Todas as regras do edital (fórmula da nota, tabela de tempo, tabela de
penalidades, tempo máximo, critérios de desempate) ficam em
[`js/config.js`](js/config.js) — nunca no código da lógica.

## Próximos passos

Backlog técnico, limitações conhecidas e como retomar o desenvolvimento:
[`PROXIMOS_PASSOS.md`](PROXIMOS_PASSOS.md).
