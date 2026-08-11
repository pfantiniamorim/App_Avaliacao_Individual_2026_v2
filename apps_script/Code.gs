/* =========================================================
   Google Apps Script — Teste de Seleção de Condutores CBMDF
   Modelo MULTI-AVALIADOR EM TEMPO REAL.

   Endpoint gratuito que recebe JSON (POST text/plain) e grava
   na planilha. Cole no editor de Apps Script da PLANILHA
   (Extensões → Apps Script) e implante como Web App.

   3 abas (criadas automaticamente se não existirem):
   - CANDIDATOS : ID | NOME_GUERRA | MATRICULA | ATIVO
                  ⚠ A chave do cadastro é a MATRICULA — a mesma que o app
                  de agendamento usa, para os dois lerem UM cadastro só.
                  A coluna ID é mantida por compatibilidade e recebe a
                  própria matrícula a cada gravação.
   - REGISTROS  : TS | DATA_HORA | AVALIADOR | CANDIDATO_ID |
                  CANDIDATO | TIPO_PENALIDADE | PONTOS   (append-only, auditável)
   - RESULTADOS : CANDIDATO_ID | TEMPO | STATUS          (1 linha por candidato)

   Ações (campo "tipo" do JSON):
   - "penalidade"        → acrescenta 1 linha em REGISTROS
   - "removerPenalidade" → remove a linha de REGISTROS com o TS informado
   - "tempo"             → grava/atualiza TEMPO+STATUS em RESULTADOS
   - "candidato"         → adiciona/edita candidato em CANDIDATOS
   - "removerCandidato"  → remove candidato de CANDIDATOS
   ========================================================= */

// ANTIGUIDADE, CATEGORIA e GBMOT ficam DEPOIS de ATIVO e são preenchidas
// direto na planilha — o app só as LÊ, nunca escreve nelas: salvarCandidato
// grava apenas as 4 primeiras colunas, então o que estiver ali é preservado.
//   ANTIGUIDADE : número, menor = mais antigo (3º desempate)
//   CATEGORIA   : QOBM | QBMG-2 | QBMG-3 | EXTERNA (destinação da vaga)
//   GBMOT       : SIM para quem disputa as 4 vagas reservadas ao GBMOT
var ABAS = {
  CANDIDATOS: ['ID', 'NOME_GUERRA', 'MATRICULA', 'ATIVO', 'ANTIGUIDADE', 'CATEGORIA', 'GBMOT'],
  REGISTROS:  ['TS', 'DATA_HORA', 'AVALIADOR', 'CANDIDATO_ID', 'CANDIDATO', 'TIPO_PENALIDADE', 'PONTOS'],
  // DATA_HORA acrescentada em 11/08/2026: sem ela não havia como saber em
  // QUE DIA um candidato executou o TPP quando ele não levava nenhuma
  // penalidade (sem marcação em REGISTROS, não sobrava nenhum carimbo de
  // tempo). O relatório diário precisa disso para separar quem correu no
  // dia, quem se adiantou e quem faltou.
  RESULTADOS: ['CANDIDATO_ID', 'TEMPO', 'STATUS', 'DATA_HORA']
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Sem conferir o retorno, uma disputa entre avaliadores deixaria
  // ler-e-escrever rodando sem proteção — melhor recusar e pedir de novo
  // (o app já tem fila offline e reenvia sozinho).
  if (!lock.tryLock(15000)) {
    return responder({ ok: false, erro: 'Servidor ocupado, tente de novo em instantes.' });
  }
  try {
    var dados = JSON.parse(e.postData.contents);
    var tipo = String(dados.tipo || '');

    switch (tipo) {
      case 'penalidade':        return responder(acrescentarPenalidade(dados));
      case 'removerPenalidade': return responder(removerPorTS('REGISTROS', dados.ts));
      case 'tempo':             return responder(gravarTempo(dados));
      case 'candidato':         return responder(salvarCandidato(dados));
      case 'removerCandidato':  return responder(removerCandidato(dados.id));
      default:                  return responder({ ok: false, erro: 'tipo desconhecido: ' + tipo });
    }
  } catch (erro) {
    return responder({ ok: false, erro: String(erro) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return responder({ ok: true, servico: 'Seleção de Condutores CBMDF', hora: new Date().toISOString() });
}

/* ---------------- Ações ---------------- */

/* O TS é gerado UMA vez por toque no botão e viaja junto na fila offline.
   Se o POST grava mas a resposta se perde no caminho (rede de celular
   oscilando), o app conclui que falhou, guarda na fila e reenvia o MESMO
   TS — e sem esta checagem a penalidade era contada duas vezes contra o
   candidato. Regravar o mesmo TS agora é no-op, então reenviar é sempre
   seguro. */
function acrescentarPenalidade(d) {
  var aba = obterAba('REGISTROS');
  var ts = String(d.ts);
  var valores = aba.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === ts) {
      return { ok: true, ts: ts, duplicada: true };
    }
  }
  aba.appendRow([
    ts, d.dataHora || '', d.avaliador || '', d.candidatoId || '',
    d.candidato || '', d.tipoPenalidade || '', d.pontos !== undefined ? d.pontos : ''
  ]);
  return { ok: true, ts: ts };
}

function gravarTempo(d) {
  var aba = obterAba('RESULTADOS');
  // Carimbo do momento do lançamento — é o que permite ao relatório diário
  // saber em que dia o candidato executou, mesmo sem nenhuma penalidade.
  var carimbo = d.dataHora || Utilities.formatDate(
    new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  var valores = aba.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(d.candidatoId)) {
      aba.getRange(i + 1, 2).setValue(d.tempo || '');
      aba.getRange(i + 1, 3).setValue(d.status || '');
      // Só carimba quando há tempo: limpar o campo não é uma execução.
      if (d.tempo) aba.getRange(i + 1, 4).setValue(carimbo);
      return { ok: true, atualizado: String(d.candidatoId) };
    }
  }
  aba.appendRow([String(d.candidatoId), d.tempo || '', d.status || '', d.tempo ? carimbo : '']);
  return { ok: true, criado: String(d.candidatoId) };
}

/* A chave do cadastro é a MATRICULA — a mesma que o app de agendamento usa.
   Casar também pelo ID cobre as linhas antigas, cadastradas quando a chave
   era um código gerado (ex.: "c72647690"); ao salvar, a coluna ID recebe a
   matrícula e a linha converge para a chave única, sem duplicar. */
function localizarCandidato(valores, id, matricula) {
  for (var i = 1; i < valores.length; i++) {
    var idLinha = String(valores[i][0]).trim();
    var matLinha = String(valores[i][2]).trim();
    if (matricula && matLinha === String(matricula).trim()) return i;
    if (id && idLinha && idLinha === String(id).trim()) return i;
  }
  return -1;
}

function salvarCandidato(d) {
  var aba = obterAba('CANDIDATOS');
  var valores = aba.getDataRange().getValues();
  var linha = [String(d.id), d.nomeGuerra || '', d.matricula || '', d.ativo === false ? 'NAO' : 'SIM'];
  var i = localizarCandidato(valores, d.id, d.matricula);
  if (i >= 0) {
    aba.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
    return { ok: true, atualizado: String(d.id) };
  }
  aba.appendRow(linha);
  return { ok: true, criado: String(d.id) };
}

function removerCandidato(id) {
  var aba = obterAba('CANDIDATOS');
  var valores = aba.getDataRange().getValues();
  // O app manda a matrícula como id; procurar nas duas colunas cobre
  // também as linhas antigas que ainda tenham um ID gerado.
  var i = localizarCandidato(valores, id, id);
  if (i < 0) return { ok: true, removido: null, aviso: 'não encontrado' };
  aba.deleteRow(i + 1);
  return { ok: true, removido: String(id) };
}

/* ---------------- Utilidades ---------------- */

// Remove a 1ª linha cuja coluna 1 == valor (usado por TS em REGISTROS)
function removerPorTS(nomeAba, ts) {
  return removerPorColuna(nomeAba, 1, ts);
}

function removerPorColuna(nomeAba, coluna, valor) {
  var aba = obterAba(nomeAba);
  var valores = aba.getDataRange().getValues();
  for (var i = valores.length - 1; i >= 1; i--) {
    if (String(valores[i][coluna - 1]) === String(valor)) {
      aba.deleteRow(i + 1);
      return { ok: true, removido: String(valor) };
    }
  }
  return { ok: true, removido: null, aviso: 'não encontrado' };
}

function obterAba(nome) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.appendRow(ABAS[nome]);
  } else if (aba.getLastRow() === 0) {
    aba.appendRow(ABAS[nome]);
  }
  return aba;
}

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Manutenção (rodar manualmente, NÃO fica exposta no doPost) ----------------
   Apaga todas as marcações de REGISTROS (mantém o cabeçalho), sem tocar em
   CANDIDATOS nem RESULTADOS. Uso: no editor do Apps Script, escolher esta
   função no seletor ao lado de "Executar" e clicar em Executar. Pede
   autorização na primeira vez; depois disso é 1 clique. */
function limparRegistrosDeTeste() {
  var aba = obterAba('REGISTROS');
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha > 1) {
    aba.deleteRows(2, ultimaLinha - 1);
  }
  Logger.log('REGISTROS limpo: %s linha(s) de penalidade removida(s).', ultimaLinha - 1);
}

/* Remove marcações de dias ANTERIORES ao da prova, preservando o dia
   corrente. Existe por causa de um caso real (11/08/2026): uma marcação
   de teste feita em 05/08 ficou 5 dias presa na fila de um aparelho —
   porque a implantação do Apps Script estava recusando tudo — e subiu
   sozinha no meio da prova quando a implantação foi corrigida.

   Ajuste DIA_DA_PROVA para o dia que deve ser PRESERVADO e execute.
   Faz uma simulação primeiro: rode com SIMULAR = true, confira o log,
   depois troque para false e rode de novo. */
function limparMarcacoesDeOutrosDias() {
  var DIA_DA_PROVA = '2026-08-12'; // AAAA-MM-DD — o dia que fica
  var SIMULAR = true;              // true = só lista; false = apaga

  var corte = new Date(DIA_DA_PROVA + 'T00:00:00').getTime();
  var aba = obterAba('REGISTROS');
  var valores = aba.getDataRange().getValues();
  var removidas = 0;

  for (var i = valores.length - 1; i >= 1; i--) {
    var ts = String(valores[i][0]);
    var ms = Number(ts.split('-')[0]);
    if (!ms || ms >= corte) continue;
    Logger.log('%s linha %s: %s | %s | %s | %s',
      SIMULAR ? '[SIMULAÇÃO] removeria' : 'REMOVIDA',
      i + 1, ts, valores[i][1], valores[i][2], valores[i][4]);
    if (!SIMULAR) aba.deleteRow(i + 1);
    removidas++;
  }
  Logger.log('%s marcação(ões) de outros dias encontrada(s). SIMULAR = %s',
    removidas, SIMULAR);
}
