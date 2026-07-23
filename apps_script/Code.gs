/* =========================================================
   Google Apps Script — Teste de Seleção de Condutores CBMDF
   Modelo MULTI-AVALIADOR EM TEMPO REAL.

   Endpoint gratuito que recebe JSON (POST text/plain) e grava
   na planilha. Cole no editor de Apps Script da PLANILHA
   (Extensões → Apps Script) e implante como Web App.

   3 abas (criadas automaticamente se não existirem):
   - CANDIDATOS : ID | NOME_GUERRA | MATRICULA | ATIVO
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

var ABAS = {
  CANDIDATOS: ['ID', 'NOME_GUERRA', 'MATRICULA', 'ATIVO'],
  REGISTROS:  ['TS', 'DATA_HORA', 'AVALIADOR', 'CANDIDATO_ID', 'CANDIDATO', 'TIPO_PENALIDADE', 'PONTOS'],
  RESULTADOS: ['CANDIDATO_ID', 'TEMPO', 'STATUS']
};

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(15000);
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

function acrescentarPenalidade(d) {
  var aba = obterAba('REGISTROS');
  aba.appendRow([
    String(d.ts), d.dataHora || '', d.avaliador || '', d.candidatoId || '',
    d.candidato || '', d.tipoPenalidade || '', d.pontos !== undefined ? d.pontos : ''
  ]);
  return { ok: true, ts: String(d.ts) };
}

function gravarTempo(d) {
  var aba = obterAba('RESULTADOS');
  var valores = aba.getDataRange().getValues();
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(d.candidatoId)) {
      aba.getRange(i + 1, 2).setValue(d.tempo || '');
      aba.getRange(i + 1, 3).setValue(d.status || '');
      return { ok: true, atualizado: String(d.candidatoId) };
    }
  }
  aba.appendRow([String(d.candidatoId), d.tempo || '', d.status || '']);
  return { ok: true, criado: String(d.candidatoId) };
}

function salvarCandidato(d) {
  var aba = obterAba('CANDIDATOS');
  var valores = aba.getDataRange().getValues();
  var linha = [String(d.id), d.nomeGuerra || '', d.matricula || '', d.ativo === false ? 'NAO' : 'SIM'];
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][0]) === String(d.id)) {
      aba.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
      return { ok: true, atualizado: String(d.id) };
    }
  }
  aba.appendRow(linha);
  return { ok: true, criado: String(d.id) };
}

function removerCandidato(id) {
  return removerPorColuna('CANDIDATOS', 1, id);
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
