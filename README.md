# Teste Profissional Prático — 3º CECEM/2026 (CBMDF/GBMOT)

App web de custo zero para lançamento e apuração em tempo real do **Teste
Profissional Prático (TPP)** do 3º Curso de Especialização para Condutores de
Veículos de Emergência, conforme o **Edital nº 047/2026-CBMDF/DIREN/SEITC**.
Até 15 avaliadores marcam penalidades do mesmo candidato simultaneamente
(cada um em sua estação do percurso); o resultado de cada candidato é a soma
de todas as marcações. Tudo fica auditável na planilha (avaliador, candidato,
infração e horário de cada marcação).

Além da apuração da Média Final (MF), o app faz a **distribuição das 24 vagas
do curso** por destinação (QOBM/Comb., QBMG-2, QBMG-3, Externas e a reserva do
GBMOT), com as redistribuições previstas no edital, e emite um **relatório
individual imprimível** por candidato, para anexar como comprovante.

**Stack:** HTML/CSS/JS puro (sem build) + Google Sheets (dados) + Google
Apps Script (API de escrita) + GitHub Pages (hospedagem). Sem dependências
pagas.

## Papéis

- **Avaliador** (`selecao.html` → `avaliacao.html` → `logs.html`): identifica-se
  uma vez, escolhe o candidato atual num seletor e marca as penalidades
  observadas. Sem senha.
- **Chefe da Avaliação** (`participantes.html`, `dashboard.html`,
  `ranking.html`, `relatorio.html`, `configuracoes.html`): cadastra os
  candidatos, lança o tempo de execução, acompanha a classificação e a
  distribuição das vagas, e imprime o relatório de cada candidato. Protegido
  por PIN (`js/config.js` → `PIN_CHEFE`).

## Configuração e publicação

Todo o passo a passo (planilha, Apps Script, GitHub Pages) está em
[`CONFIGURAR_PLANILHA.md`](CONFIGURAR_PLANILHA.md).

Todas as regras do edital (fórmula da nota, tabela de tempo, tabela de
penalidades, tempo máximo, critérios de desempate) ficam em
[`js/config.js`](js/config.js) — nunca no código da lógica.

## Próximos passos

Backlog técnico, limitações conhecidas e como retomar o desenvolvimento:
[`PROXIMOS_PASSOS.md`](PROXIMOS_PASSOS.md).
