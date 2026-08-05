# Configuração — Planilha Google + GitHub Pages (custo zero)

App: **Teste de Seleção de Condutores de Viatura (CBMDF/GBMOT)**
Persistência: **Google Sheets** (grátis) • Hospedagem: **GitHub Pages** (grátis)
Modelo: **até 15 avaliadores marcam o MESMO candidato em tempo real** — o log
de cada candidato é a soma das marcações de todos, tudo auditável na planilha.

---

## 1. Criar a planilha (3 abas)

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma planilha
   (ex.: `Selecao_Condutores_2026`).
2. Crie estas 3 abas, cada uma com o cabeçalho exato na linha 1
   (uma coluna por célula):

   **CANDIDATOS** (cadastro feito pelo Chefe da Avaliação)
   ```
   ID | NOME_GUERRA | MATRICULA | ATIVO | ANTIGUIDADE
   ```

   > `ANTIGUIDADE` é **opcional** e fica sempre na última coluna: número,
   > **menor = mais antigo**, usado como 3º critério de desempate do edital
   > (após menor tempo e menos penalidades). Preenchida direto na planilha —
   > o app só lê, nunca escreve nela. Vazia = o critério não desempata nada.

   > **A chave do cadastro é a `MATRICULA`** — a mesma que o app de
   > agendamento ([`painel-de-agendamento`](https://github.com/pfantiniamorim/painel-de-agendamento))
   > usa para ler esta aba. É por isso que os dois apps enxergam **um
   > cadastro só**. A coluna `ID` continua existindo por compatibilidade e
   > recebe a própria matrícula a cada gravação; linha antiga com `ID`
   > gerado (ex.: `c72647690`) é reconhecida e migrada sozinha na primeira
   > edição pelo `participantes.html`, sem duplicar.

   **REGISTROS** (log auditável — 1 linha por penalidade marcada)
   ```
   TS | DATA_HORA | AVALIADOR | CANDIDATO_ID | CANDIDATO | TIPO_PENALIDADE | PONTOS
   ```

   **RESULTADOS** (tempo de prova — 1 linha por candidato)
   ```
   CANDIDATO_ID | TEMPO | STATUS
   ```

> Se você já tinha a aba antiga **LANCAMENTOS** de uma versão anterior do
> app, pode deixá-la ali sem problema (não é mais usada) ou apagá-la.

## 2. Instalar o Apps Script (escrita automática)

> ⚠ **Este é o script VINCULADO à planilha, e ele é exclusivo deste app.**
> Uma planilha admite **um único** script vinculado. O app de agendamento
> compartilha a mesma planilha, mas roda num projeto **independente**
> (script.google.com → Novo projeto), com implantação e URL próprias.
> Colar o `Code.gs` de um por cima do outro aqui apaga o `doPost` do outro
> app — foi o que aconteceu em 05/08/2026 e deixou a marcação de
> penalidades respondendo "Ação inválida".

1. Na planilha: **Extensões → Apps Script**.
2. Apague o conteúdo e cole o arquivo [`apps_script/Code.gs`](apps_script/Code.gs).
3. **Implantar → Gerenciar implantações**:
   - Se já existe uma implantação de uma versão anterior: clique no ícone de
     lápis (editar) → em **Versão**, escolha **Nova versão** → **Implantar**.
   - Se é a primeira vez: **Implantar → Nova implantação → Tipo: App da Web**
     → Executar como: **Eu** → Quem pode acessar: **Qualquer pessoa**.
4. Autorize quando o Google pedir e **copie a URL** (termina em `/exec`).
5. Cole essa URL em `js/config.js` → `ENDPOINT_APPS_SCRIPT` (se você reimplantou
   uma versão existente, a URL não muda — pode conferir que está igual).

> O app envia o POST com `Content-Type: text/plain` — requisição "simples",
> sem preflight CORS. Funciona no GitHub Pages e até abrindo o HTML direto
> do computador (`file://`).

## 3. Publicar a leitura (CSV das 3 abas)

1. Compartilhe a planilha: **Compartilhar → Qualquer pessoa com o link → Leitor**.
2. Pegue o ID da planilha (o trecho longo da URL entre `/d/` e `/edit`).
3. Monte as 3 URLs (uma por aba) e cole em `js/config.js`:
   - `CSV_CANDIDATOS_URL` = `https://docs.google.com/spreadsheets/d/SEU_ID/gviz/tq?tqx=out:csv&sheet=CANDIDATOS`
   - `CSV_REGISTROS_URL` = `https://docs.google.com/spreadsheets/d/SEU_ID/gviz/tq?tqx=out:csv&sheet=REGISTROS`
   - `CSV_RESULTADOS_URL` = `https://docs.google.com/spreadsheets/d/SEU_ID/gviz/tq?tqx=out:csv&sheet=RESULTADOS`

Este formato (`/gviz/tq`) atualiza em segundos — é o que dá o efeito de
"tempo real" no ranking e no dashboard.

## 4. Revisar o `js/config.js`

Além das 4 URLs acima, confira as regras do edital — **tudo fica neste
arquivo**, nunca no código da lógica: `FORMULA_NOTA`, `TABELA_TEMPO`,
`TABELA_PENALIDADES`, `TEMPO_MAXIMO`, `EXERCICIOS`, `CRITERIOS_DESEMPATE`,
`POLLING_MS` e `PIN_CHEFE` (senha das telas administrativas — troque o valor
padrão `2026`).

Estão preenchidos com o **edital nº 047/2026 (3º CECEM/2026)**, item 8, com
uma exceção: ⚠ **`FORMULA_NOTA` ainda é a do edital anterior** — a fórmula
da MF não veio no texto transcrito. Conferir no Anexo antes da prova oficial.

> **Nunca renomeie um item de `TABELA_PENALIDADES` com a prova em
> andamento.** `REGISTROS` guarda o *nome* da infração; renomear faz as
> marcações já gravadas deixarem de ser reconhecidas. O app não erra em
> silêncio — o indicador de status mostra
> "⚠ N MARCAÇÃO(ÕES) NÃO RECONHECIDA(S)" e o console detalha quais —, mas o
> conserto é restaurar o nome antigo ou corrigir a coluna `TIPO_PENALIDADE`
> na planilha.

## 5. Acesso do Chefe da Avaliação (PIN)

As telas **Cadastro de Candidatos**, **Dashboard** e **Configurações** pedem
o PIN definido em `PIN_CHEFE` (`js/config.js`) na primeira visita de cada
navegador/aparelho. Isso é apenas um dificultador de acesso casual, não é
autenticação real — o app é 100% estático (sem servidor), então o PIN fica
visível a quem inspecionar o código-fonte. Não use para dados sigilosos.

As telas do avaliador (**Identificação**, **Avaliação**, **Logs**) continuam
abertas, sem PIN — são as que os 15 avaliadores usam em campo.

## 6. Publicar no GitHub Pages (via GitHub Desktop)

1. Instale o [GitHub Desktop](https://desktop.github.com) e faça login com
   sua conta GitHub.
2. **File → Add local repository** → selecione a pasta
   `App_Avaliacao_Individual_2026`.
3. **Publish repository** (marque como público, sem custo).
4. No site github.com, dentro do repositório recém-criado:
   **Settings → Pages → Branch: `main` / pasta `/ (root)` → Save**.
5. Em ~1 minuto o app estará em `https://SEU_USUARIO.github.io/NOME_DO_REPO/`.

Para futuras alterações: edite os arquivos, no GitHub Desktop vai aparecer a
lista de mudanças → escreva uma mensagem de commit → **Commit to main** →
**Push origin**. O GitHub Pages atualiza sozinho em cerca de 1 minuto.

## 7. Testar (critérios de aceite)

1. **Cadastro:** abra `participantes.html`, digite o PIN, cadastre 2-3
   candidatos de teste (Nome de Guerra + Matrícula).
2. **Marcação multi-avaliador:** em duas abas/celulares diferentes, entre
   como avaliadores diferentes em `selecao.html` → `avaliacao.html` →
   selecione o **mesmo** candidato nos dois → marque penalidades em cada
   aba → confirme que a "Situação Geral" soma as marcações dos dois.
3. **Tempo:** no `dashboard.html` (com PIN), lance o tempo de um candidato
   → confirme que a nota (MF) aparece no ranking em poucos segundos.
4. **Auditoria:** em `logs.html`, confira que cada penalidade aparece com
   avaliador, candidato e horário — uma linha por marcação.
5. **Offline:** derrube a conexão do celular do avaliador, marque uma
   penalidade → o indicador mostra "NA FILA"; ao reconectar, é enviada
   automaticamente no próximo ciclo de sincronização.

## Observação de acesso

O endpoint gravável e a planilha de leitura são públicos (é o que permite o
custo zero, sem login). Não coloque dados sensíveis além do necessário e,
encerrado o teste, desative a implantação do Apps Script
(**Implantar → Gerenciar implantações → Arquivar**).
