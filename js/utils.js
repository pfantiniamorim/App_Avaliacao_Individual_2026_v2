/* =========================================================
   Utilidades compartilhadas — Teste de Seleção de Condutores
   de Viatura (CBMDF/GBMOT).

   Modelo MULTI-AVALIADOR EM TEMPO REAL sobre Google Sheets:
   - escrita: cada penalidade é 1 POST imediato (append em
     REGISTROS); resiliente a queda (fila offline).
   - leitura: polling das 3 abas (CANDIDATOS, REGISTROS,
     RESULTADOS) via CSV; a MF é recalculada no cliente
     somando as penalidades por candidato + tempo + fórmula.

   Toda regra de pontuação vem de window.APP_CONFIG.
   Carregar DEPOIS de js/config.js. Expõe window.AppUtils.
   ========================================================= */
(function () {
  "use strict";
  var CFG = window.APP_CONFIG;

  /* ---------------- Tempo ---------------- */
  function timeToSeconds(str) {
    if (typeof str !== "string") return null;
    var m = str.trim().match(/^(\d{1,2}):([0-5]\d)$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  function isValidTime(str) { return timeToSeconds(str) !== null; }

  function horaAgora() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function fmtHoje() {
    return new Date().toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", year: "numeric"
    }).toUpperCase().replace(/\./g, "");
  }

  /* ---------------- Penalidades ---------------- */
  function penaltyByKey(key) {
    return CFG.TABELA_PENALIDADES.find(function (p) { return p.key === key; }) || null;
  }

  // REGISTROS guarda TIPO_PENALIDADE pelo NOME (não pela key) — ver
  // marcarPenalidade(). Aceita os dois para não quebrar quem já usa key.
  function penaltyByNome(nome) {
    return CFG.TABELA_PENALIDADES.find(function (p) { return p.nome === nome || p.key === nome; }) || null;
  }

  function isEliminatoria(p) {
    return !!p && String(p.pontos).toUpperCase() === "ELIMINATORIO";
  }

  // contagens: { toque: 2, derrubada: 1, ... } → pontos somados
  function pontosPenalidades(contagens) {
    contagens = contagens || {};
    return CFG.TABELA_PENALIDADES.reduce(function (sum, p) {
      if (isEliminatoria(p)) return sum;
      return sum + (contagens[p.key] || 0) * Number(p.pontos);
    }, 0);
  }

  function temEliminatoria(contagens) {
    contagens = contagens || {};
    return CFG.TABELA_PENALIDADES.find(function (p) {
      return isEliminatoria(p) && (contagens[p.key] || 0) > 0;
    }) || null;
  }

  /* ---------------- Fórmula configurável ----------------
     Aceita apenas números, operadores, parênteses e as
     variáveis conhecidas (identificadores em MAIÚSCULAS). */
  function avaliarFormula(formula, vars) {
    formula = String(formula || "").trim();
    if (!formula) throw new Error("Fórmula vazia");
    if (!/^[\s0-9+\-*/().,A-Z_]*$/.test(formula)) {
      throw new Error("Fórmula contém caracteres não permitidos");
    }
    var nomes = Object.keys(vars);
    var ids = formula.match(/[A-Z_][A-Z0-9_]*/g) || [];
    var desconhecidos = ids.filter(function (id) { return nomes.indexOf(id) === -1; });
    if (desconhecidos.length) {
      throw new Error("Variável desconhecida na fórmula: " + desconhecidos.join(", "));
    }
    /* eslint-disable no-new-func */
    var fn = new Function(nomes.join(","), "return (" + formula + ");");
    var r = fn.apply(null, nomes.map(function (n) { return vars[n]; }));
    if (typeof r !== "number" || !isFinite(r)) throw new Error("Fórmula não produziu um número");
    return r;
  }

  function formulaSubstituida(formula, vars) {
    var texto = String(formula);
    Object.keys(vars).forEach(function (n) {
      texto = texto.replace(new RegExp("\\b" + n + "\\b", "g"), String(vars[n]));
    });
    return texto;
  }

  /* ---------------- Pontuação por tempo ---------------- */
  function pontuacaoTempo(seg) {
    if (seg === null || seg === undefined) return null;
    var faixas = (CFG.TABELA_TEMPO || [])
      .map(function (f) { return { ateSeg: timeToSeconds(f.ate), pontos: Number(f.pontos) }; })
      .filter(function (f) { return f.ateSeg !== null; })
      .sort(function (a, b) { return a.ateSeg - b.ateSeg; });
    for (var i = 0; i < faixas.length; i++) {
      if (seg <= faixas[i].ateSeg) return faixas[i].pontos;
    }
    return 0;
  }

  /* ---------------- Resultado do candidato ----------------
     tempoStr: "MM:SS" (ou vazio) ; contagens: {key: qtd}
     Retorna { tempoSeg, pontuacaoTempo, pontosPen, eliminado,
     motivo, mf, memorial }.                                  */
  function calcularResultado(tempoStr, contagens) {
    contagens = contagens || {};
    var tempoSeg = timeToSeconds(tempoStr);
    var tempoMaxSeg = timeToSeconds(CFG.TEMPO_MAXIMO);

    var eliminado = false, motivo = "";
    var elim = temEliminatoria(contagens);
    if (elim) {
      eliminado = true;
      motivo = "PENALIDADE ELIMINATÓRIA: " + elim.nome.toUpperCase();
    } else if (tempoSeg !== null && tempoMaxSeg !== null && tempoSeg > tempoMaxSeg) {
      eliminado = true;
      motivo = "TEMPO ACIMA DO MÁXIMO (" + CFG.TEMPO_MAXIMO + ")";
    }

    var ptsTempo = pontuacaoTempo(tempoSeg);
    var ptsPen = pontosPenalidades(contagens);

    var mf = null, memorial = "";
    if (eliminado) {
      mf = 0; memorial = motivo;
    } else if (tempoSeg !== null) {
      var vars = { PONTUACAO_TEMPO: ptsTempo, PENALIDADES: ptsPen };
      try {
        mf = Math.max(0, Math.round(avaliarFormula(CFG.FORMULA_NOTA, vars) * 100) / 100);
        memorial = formulaSubstituida(CFG.FORMULA_NOTA, vars) + " = " + mf.toFixed(2);
      } catch (e) {
        memorial = "ERRO NA FÓRMULA: " + e.message;
      }
    }

    return {
      tempoSeg: tempoSeg, pontuacaoTempo: ptsTempo, pontosPen: ptsPen,
      eliminado: eliminado, motivo: motivo, mf: mf, memorial: memorial
    };
  }

  /* ---------------- CSV ---------------- */
  function parseCSV(texto) {
    var linhas = [], linha = [], campo = "", dentro = false;
    for (var i = 0; i < texto.length; i++) {
      var c = texto[i];
      if (dentro) {
        if (c === '"') { if (texto[i + 1] === '"') { campo += '"'; i++; } else dentro = false; }
        else campo += c;
      } else if (c === '"') { dentro = true; }
      else if (c === ",") { linha.push(campo); campo = ""; }
      else if (c === "\n") { linha.push(campo.replace(/\r$/, "")); linhas.push(linha); linha = []; campo = ""; }
      else campo += c;
    }
    if (campo !== "" || linha.length) { linha.push(campo.replace(/\r$/, "")); linhas.push(linha); }
    return linhas;
  }

  function csvParaObjetos(texto) {
    var linhas = parseCSV(texto).filter(function (l) {
      return l.some(function (v) { return String(v).trim() !== ""; });
    });
    if (linhas.length < 1) return [];
    var cab = linhas[0].map(function (c) { return String(c).trim().toUpperCase(); });
    return linhas.slice(1).map(function (l) {
      var o = {};
      cab.forEach(function (c, i) { o[c] = l[i] !== undefined ? String(l[i]).trim() : ""; });
      return o;
    });
  }

  /* ---------------- Parsers das 3 abas ---------------- */

  // ATIVO da aba CANDIDATOS. Mesma leitura do app de agendamento, que
  // reaproveita esta coluna: quem sai daqui também perde o agendamento.
  // Aceita "NAO" e "NÃO" — a planilha é digitada à mão.
  function candidatoAtivo(valor) {
    var v = String(valor || "").trim().toUpperCase().replace(/Ã/g, "A");
    return v !== "NAO" && v !== "N" && v !== "FALSO" && v !== "FALSE" && v !== "0";
  }

  // Coluna SIM/NÃO em que o padrão (célula vazia) é NÃO — ao contrário de
  // ATIVO. Usada em GBMOT: quem não marcou não é do GBMOT.
  function marcadoSim(valor) {
    var v = String(valor || "").trim().toUpperCase().replace(/Ã/g, "A");
    return v === "SIM" || v === "S" || v === "VERDADEIRO" || v === "TRUE" || v === "1" || v === "X";
  }

  // CATEGORIA da planilha → chave de CFG.VAGAS. Tolera acento, espaço,
  // ponto e barra ("QBMG-2", "qbmg 2", "QOBM/Comb." caem no mesmo lugar).
  function normalizarCategoria(valor) {
    var v = String(valor || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!v) return null;
    var alias = (CFG.ALIAS_CATEGORIA || {})[v];
    if (alias) return alias;
    var direto = (CFG.VAGAS || []).find(function (d) {
      return d.key.replace(/[^A-Z0-9]/g, "") === v;
    });
    return direto ? direto.key : null;
  }

  /* A chave do candidato é a MATRICULA — o mesmo identificador que o app de
     agendamento usa, para os dois lerem UM cadastro só. O ID legado só entra
     como reserva, para linha antiga que não tenha matrícula. */
  function parseCandidatos(objs) {
    var out = {};
    (objs || []).forEach(function (o) {
      var matricula = (o.MATRICULA || "").trim();
      var chave = matricula || (o.ID || "").trim();
      if (!chave) return;
      // ANTIGUIDADE é opcional (3º critério de desempate do edital 047/2026,
      // item 8.1.10). Número, menor = mais antigo. Vazia = não desempata.
      var antiguidade = parseFloat(String(o.ANTIGUIDADE || "").replace(",", "."));
      out[chave] = {
        id: chave,
        nome: (o.NOME_GUERRA || o.NOME || "").trim(),
        matricula: matricula,
        ativo: candidatoAtivo(o.ATIVO),
        antiguidade: isFinite(antiguidade) ? antiguidade : null,
        // Destinação da vaga (quadro "DISTRIBUIÇÃO DAS VAGAS") e reserva
        // do GBMOT. Ambas opcionais: sem CATEGORIA o candidato entra no
        // ranking normalmente, mas não concorre a vaga nenhuma.
        categoria: normalizarCategoria(o.CATEGORIA),
        categoriaBruta: (o.CATEGORIA || "").trim(),
        gbmot: marcadoSim(o.GBMOT)
      };
    });
    return out;
  }

  function parseRegistros(objs) {
    return (objs || [])
      .filter(function (o) { return (o.CANDIDATO_ID || o.CANDIDATO || "").trim() !== ""; })
      .map(function (o) {
        return {
          ts: (o.TS || "").trim(),
          dataHora: (o.DATA_HORA || "").trim(),
          avaliador: (o.AVALIADOR || "").trim(),
          candidatoId: (o.CANDIDATO_ID || "").trim(),
          candidato: (o.CANDIDATO || "").trim(),
          tipoPenalidade: (o.TIPO_PENALIDADE || "").trim()
        };
      });
  }

  function parseResultados(objs) {
    var out = {};
    (objs || []).forEach(function (o) {
      var id = (o.CANDIDATO_ID || "").trim();
      if (!id) return;
      out[id] = { tempo: (o.TEMPO || "").trim(), status: (o.STATUS || "").trim() };
    });
    return out;
  }

  /* ---------------- Agregação (coração do modelo) ----------------
     Soma as penalidades de TODOS os avaliadores por candidato e
     junta o tempo. Retorna array de candidatos com .resultado.  */
  var ultimosDesconhecidos = [];

  // Marcações da planilha que a TABELA_PENALIDADES atual não reconhece,
  // referentes à última chamada de montarCandidatos(). Lista vazia = tudo
  // contabilizado. Ver o aviso emitido em iniciarPolling().
  function penalidadesDesconhecidas() { return ultimosDesconhecidos.slice(); }

  function montarCandidatos(candidatos, registros, resultados) {
    candidatos = candidatos || {};
    resultados = resultados || {};
    var contagemPorId = {};

    // Tipos de penalidade que estão em REGISTROS mas não existem mais na
    // TABELA_PENALIDADES — normalmente porque alguém renomeou uma infração
    // em js/config.js depois que a prova começou. Não podem sumir da conta
    // em silêncio: o candidato perderia pontos sem ninguém perceber.
    var desconhecidos = {};
    (registros || []).forEach(function (r) {
      var id = r.candidatoId || ("_nome:" + r.candidato.toUpperCase());
      var p = CFG.TABELA_PENALIDADES.find(function (x) { return x.nome === r.tipoPenalidade || x.key === r.tipoPenalidade; });
      if (!p) { desconhecidos[r.tipoPenalidade] = (desconhecidos[r.tipoPenalidade] || 0) + 1; return; }
      if (!contagemPorId[id]) contagemPorId[id] = {};
      contagemPorId[id][p.key] = (contagemPorId[id][p.key] || 0) + 1;
    });
    ultimosDesconhecidos = Object.keys(desconhecidos).map(function (nome) {
      return { tipoPenalidade: nome, marcacoes: desconhecidos[nome] };
    });

    // Base: todos os candidatos cadastrados (mesmo sem marcações)
    var ids = Object.keys(candidatos);
    // Inclui ids que aparecem em registros mas não no cadastro (robustez)
    Object.keys(contagemPorId).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });

    return ids.map(function (id) {
      var c = candidatos[id] || {
        id: id, nome: id.replace(/^_nome:/, ""), matricula: "", ativo: true,
        antiguidade: null, categoria: null, categoriaBruta: "", gbmot: false
      };
      var contagens = contagemPorId[id] || {};
      var res = resultados[id] || {};
      var r = calcularResultado(res.tempo || "", contagens);
      return {
        id: id, nome: c.nome, matricula: c.matricula, ativo: c.ativo,
        antiguidade: c.antiguidade === undefined ? null : c.antiguidade,
        categoria: c.categoria || null, categoriaBruta: c.categoriaBruta || "",
        gbmot: c.gbmot === true,
        tempo: res.tempo || "", contagens: contagens, resultado: r
      };
    });
  }

  // Ordena por MF desc + desempate configurável (só candidatos ativos)
  function classificarRanking(candidatosArr) {
    var criterios = CFG.CRITERIOS_DESEMPATE || [];
    return candidatosArr.slice()
      .filter(function (c) { return c.ativo !== false && c.nome; })
      .sort(function (a, b) {
        if (a.resultado.eliminado !== b.resultado.eliminado) return a.resultado.eliminado ? 1 : -1;
        var mfA = a.resultado.mf === null ? -1 : a.resultado.mf;
        var mfB = b.resultado.mf === null ? -1 : b.resultado.mf;
        if (mfB !== mfA) return mfB - mfA;
        for (var i = 0; i < criterios.length; i++) {
          var crt = String(criterios[i]).toLowerCase();
          if (crt === "tempo") {
            var ta = a.resultado.tempoSeg === null ? Infinity : a.resultado.tempoSeg;
            var tb = b.resultado.tempoSeg === null ? Infinity : b.resultado.tempoSeg;
            if (ta !== tb) return ta - tb;
          } else if (crt === "penalidades") {
            if (a.resultado.pontosPen !== b.resultado.pontosPen) return a.resultado.pontosPen - b.resultado.pontosPen;
          } else if (crt === "antiguidade") {
            // Coluna ANTIGUIDADE (opcional) da aba CANDIDATOS: menor = mais
            // antigo. Quem não tem o número vai para o fim deste critério —
            // sem valor cadastrado, o desempate fica com o Chefe.
            var aa = a.antiguidade === null || a.antiguidade === undefined ? Infinity : a.antiguidade;
            var ab = b.antiguidade === null || b.antiguidade === undefined ? Infinity : b.antiguidade;
            if (aa !== ab) return aa - ab;
          }
        }
        return (a.nome || "").localeCompare(b.nome || "");
      });
  }

  /* ---------------- Distribuição das vagas do curso ----------------
     Recebe o ranking JÁ CLASSIFICADO (classificarRanking) e distribui as
     vagas de CFG.VAGAS na ordem em que estão configuradas.

     Como funciona, em uma frase: cada destinação chama os seus melhores
     colocados até encher; o que sobrar vai para quem o edital mandou
     herdar; e repete-se enquanto uma herança criar vaga nova.

     Candidato ELIMINADO nunca ocupa vaga. Candidato sem CATEGORIA
     reconhecida também não — ele aparece em `semCategoria` para o Chefe
     corrigir a planilha, em vez de ser encaixado num lugar qualquer.

     Retorna { destinos, semVaga, semCategoria, porCandidato }:
     - destinos[]     : { key, nome, postos, quantidade, vagas,
                          classificados[], remanescentes, herdadas }
     - semVaga[]      : classificados sem vaga (cadastro de reserva)
     - semCategoria[] : não concorreram por falta de CATEGORIA válida
     - porCandidato   : id → { destino, nome, posicao } */
  function distribuirVagas(ranking) {
    var destinos = (CFG.VAGAS || []).map(function (d) {
      return {
        key: d.key, nome: d.nome || d.key, postos: d.postos || "",
        reserva: d.reserva === true, redistribuiPara: d.redistribuiPara || null,
        quantidade: Number(d.quantidade) || 0,   // o que o edital previu
        vagas: Number(d.quantidade) || 0,        // após heranças
        herdadas: 0, remanescentes: 0, classificados: []
      };
    });
    var porKey = {};
    destinos.forEach(function (d) { porKey[d.key] = d; });

    var elegiveis = (ranking || []).filter(function (c) {
      return !c.resultado.eliminado && c.resultado.mf !== null;
    });
    var semCategoria = elegiveis.filter(function (c) { return !c.categoria && !c.gbmot; });

    var alocado = {};
    function disponiveis(destino) {
      return elegiveis.filter(function (c) {
        if (alocado[c.id]) return false;
        return destino.reserva ? c.gbmot === true : c.categoria === destino.key;
      });
    }

    /* 1) HERANÇAS PRIMEIRO. Cada candidato tem uma só CATEGORIA, então
       quanto uma destinação consegue encher depende apenas do próprio
       grupo — dá para acertar as sobras ANTES de distribuir de fato.
       Isso é o que garante a promessa da reserva do GBMOT: se a herança
       chegasse depois, um militar do GBMOT ocuparia uma das 4 reservadas
       enquanto ainda havia vaga herdada na graduação dele.
       O laço repete porque uma herança pode cascatear; ninguém devolve
       vaga, então sempre converge — o teto de voltas é só uma trava
       contra redistribuição circular mal configurada. */
    var mudou = true, voltas = 0;
    while (mudou && voltas < destinos.length + 2) {
      mudou = false; voltas++;
      destinos.forEach(function (d) {
        if (d.reserva) return;
        var sobra = d.vagas - Math.min(d.vagas, disponiveis(d).length);
        if (sobra <= 0 || !d.redistribuiPara || !porKey[d.redistribuiPara]) return;
        porKey[d.redistribuiPara].vagas += sobra;
        porKey[d.redistribuiPara].herdadas += sobra;
        d.vagas -= sobra;
        mudou = true;
      });
    }

    // 2) Distribuição, na ordem configurada — a reserva do GBMOT vem por
    //    último e pega quem já não tiver conseguido vaga na graduação.
    destinos.forEach(function (d) {
      disponiveis(d).slice(0, d.vagas).forEach(function (c) {
        alocado[c.id] = d.key;
        d.classificados.push(c);
      });
    });

    // Sobra sem destino previsto no edital: remanescente, decisão da comissão.
    destinos.forEach(function (d) { d.remanescentes = d.vagas - d.classificados.length; });

    var porCandidato = {};
    destinos.forEach(function (d) {
      d.classificados.forEach(function (c, i) {
        porCandidato[c.id] = { destino: d.key, nome: d.nome, posicao: i + 1 };
      });
    });

    return {
      destinos: destinos,
      semVaga: elegiveis.filter(function (c) { return !alocado[c.id]; }),
      semCategoria: semCategoria,
      porCandidato: porCandidato
    };
  }

  /* Posição de cada candidato dentro da própria CATEGORIA, considerando
     todos os classificados dela (não só os que pegaram vaga) — é o número
     que vai no relatório individual. Retorna id → { posicao, total }. */
  function posicoesPorCategoria(ranking) {
    var porCategoria = {};
    (ranking || []).forEach(function (c) {
      if (!c.categoria || c.resultado.eliminado) return;
      (porCategoria[c.categoria] = porCategoria[c.categoria] || []).push(c);
    });
    var out = {};
    Object.keys(porCategoria).forEach(function (cat) {
      porCategoria[cat].forEach(function (c, i) {
        out[c.id] = { posicao: i + 1, total: porCategoria[cat].length };
      });
    });
    return out;
  }

  /* ---------------- Indicador de status ---------------- */
  var badge = null;
  function garantirBadge() {
    if (badge) return badge;
    badge = document.createElement("div");
    badge.id = "status-sync";
    badge.style.cssText =
      "position:fixed;bottom:84px;right:8px;z-index:70;padding:4px 12px;" +
      "font:900 10px 'Public Sans',sans-serif;letter-spacing:.15em;color:#fff;" +
      "background:#5e5e5e;text-transform:uppercase;max-width:80vw;";
    badge.textContent = "AGUARDANDO…";
    document.body.appendChild(badge);
    return badge;
  }

  // tipo: "ok" | "erro" | "busy" | "info"
  function setStatus(texto, tipo) {
    var b = garantirBadge();
    b.textContent = texto;
    b.style.background = tipo === "ok" ? "#1b5e20"
      : tipo === "erro" ? "#ba1a1a"
      : tipo === "busy" ? "#3b3b3b" : "#5e5e5e";
  }

  function comCacheBuster(url) {
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + Date.now();
  }

  /* ---------------- Leitura (polling das 3 abas) ----------------
     Chama aoAtualizar({ candidatos, registros, resultados,
     agregado, ranking }) ou aoAtualizar(null) se faltar URL.   */
  function iniciarPolling(aoAtualizar) {
    async function baixarCSV(url) {
      var r = await fetch(comCacheBuster(url), { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return csvParaObjetos(await r.text());
    }
    async function tick() {
      if (!CFG.CSV_CANDIDATOS_URL || !CFG.CSV_REGISTROS_URL || !CFG.CSV_RESULTADOS_URL) {
        setStatus("CONFIGURE AS URLS CSV EM js/config.js", "erro");
        aoAtualizar(null);
        return;
      }
      try {
        var res = await Promise.all([
          baixarCSV(CFG.CSV_CANDIDATOS_URL),
          baixarCSV(CFG.CSV_REGISTROS_URL),
          baixarCSV(CFG.CSV_RESULTADOS_URL)
        ]);
        var candidatos = parseCandidatos(res[0]);
        var registros = parseRegistros(res[1]);
        var resultados = parseResultados(res[2]);
        var agregado = montarCandidatos(candidatos, registros, resultados);
        aoAtualizar({
          candidatos: candidatos, registros: registros, resultados: resultados,
          agregado: agregado, ranking: classificarRanking(agregado)
        });
        var orfas = penalidadesDesconhecidas();
        if (orfas.length) {
          // Nunca silencioso: marcação na planilha que a tabela atual não
          // reconhece está fora da nota de alguém.
          console.warn("[CONDUTORES] Penalidades em REGISTROS fora da TABELA_PENALIDADES:", orfas);
          setStatus("⚠ " + orfas.reduce(function (s, o) { return s + o.marcacoes; }, 0) +
            " MARCAÇÃO(ÕES) NÃO RECONHECIDA(S) — VER CONFIGURAÇÕES", "erro");
        } else {
          setStatus("ATUALIZADO ÀS " + horaAgora(), "ok");
        }
      } catch (e) {
        console.warn("[CONDUTORES] Falha na leitura:", e);
        setStatus("FALHA NA LEITURA — " + horaAgora(), "erro");
      }
      reenviarPendentes();
    }
    tick();
    var intervalId = setInterval(tick, CFG.POLLING_MS || 12000);
    // `atualizarAgora` permite refletir na hora uma marcação/remoção que
    // este próprio aparelho acabou de fazer, em vez de esperar até
    // POLLING_MS (12s) pelo próximo ciclo automático.
    return { atualizarAgora: tick, parar: function () { clearInterval(intervalId); } };
  }

  /* ---------------- Escrita (Apps Script doPost) ----------------
     POST com Content-Type text/plain (requisição "simples", sem
     preflight CORS — funciona em GitHub Pages e em file://).     */
  var FILA_KEY = "condutores_fila_v2";

  /* Um alerta por sessão. Com 15 avaliadores marcando em campo, repetir a
     caixa a cada toque atrapalharia mais do que ajuda — mas ficar 100%
     silencioso foi o que deixou a marcação falhar sem ninguém notar. */
  var jaAvisou = false;
  function avisarUmaVez(texto) {
    if (jaAvisou) return;
    jaAvisou = true;
    setTimeout(function () { alert(texto); }, 0);
  }
  function lerFila() { try { return JSON.parse(localStorage.getItem(FILA_KEY)) || []; } catch (e) { return []; } }
  function salvarFila(f) { localStorage.setItem(FILA_KEY, JSON.stringify(f)); }

  /* Marcações que passaram da validade não somem: ficam aqui, para o
     Chefe decidir o que fazer, em vez de entrarem sozinhas na prova
     errada dias depois. */
  var FILA_VENCIDA_KEY = "condutores_fila_vencida";

  function idadeDaMarcacao(d) {
    var ms = Number(String(d && d.ts || "").split("-")[0]);
    return ms ? Date.now() - ms : 0;
  }

  /* Separa da fila o que é velho demais para subir. Ver o comentário de
     FILA_VALIDADE_MS em js/config.js: uma marcação de 05/08 presa numa
     fila entrou no meio da prova de 11/08 quando a implantação foi
     corrigida. */
  function quarentenarVencidas() {
    var validade = CFG.FILA_VALIDADE_MS;
    if (!validade) return lerFila();
    var fila = lerFila();
    var atuais = [], vencidas = [];
    fila.forEach(function (d) {
      (idadeDaMarcacao(d) > validade ? vencidas : atuais).push(d);
    });
    if (!vencidas.length) return atuais;

    var guardadas;
    try { guardadas = JSON.parse(localStorage.getItem(FILA_VENCIDA_KEY)) || []; } catch (e) { guardadas = []; }
    localStorage.setItem(FILA_VENCIDA_KEY, JSON.stringify(guardadas.concat(vencidas)));
    salvarFila(atuais);

    console.warn("[CONDUTORES] Marcações velhas retiradas da fila (não foram gravadas):", vencidas);
    setStatus("⚠ " + vencidas.length + " MARCAÇÃO(ÕES) ANTIGA(S) RETIDA(S) — VER O CHEFE", "erro");
    avisarUmaVez(
      vencidas.length + " marcação(ões) presa(s) neste aparelho há mais de " +
      Math.round(validade / 3600000) + "h NÃO foram enviadas.\n\n" +
      "São de outro dia de prova e entrariam no meio dos candidatos de hoje. " +
      "Ficaram guardadas no aparelho para o Chefe da Avaliação conferir.\n\n" +
      "Candidato(s): " + vencidas.map(function (d) { return d.candidato || d.candidatoId; }).join(", "));
    return atuais;
  }

  /* Duas falhas MUITO diferentes eram relatadas com a mesma frase
     ("SEM CONEXÃO"), e isso escondeu por horas um problema de implantação:
     - "rede"     : o celular não alcançou o servidor. Reenviar resolve.
     - "servidor" : o servidor respondeu e RECUSOU. Reenviar não resolve;
                    é configuração errada (tipicamente a URL do Apps
                    Script servindo o script do outro app).
     `e.tipoFalha` carrega essa distinção, e `e.message` traz o que o
     servidor de fato respondeu, em vez de uma mensagem inventada aqui. */
  function falha(mensagem, tipo) {
    var e = new Error(mensagem);
    e.tipoFalha = tipo;
    return e;
  }

  async function postJson(dados) {
    var r;
    try {
      r = await fetch(CFG.ENDPOINT_APPS_SCRIPT, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(dados),
        redirect: "follow"
      });
    } catch (e) {
      throw falha("sem conexão com o servidor", "rede");
    }

    // 5xx e 429 são passageiros — vale reenviar depois.
    if (r.status >= 500 || r.status === 429) {
      throw falha("servidor indisponível (HTTP " + r.status + ")", "rede");
    }

    var j = null;
    try { j = await r.json(); } catch (e) { j = null; }

    if (!j) {
      // Apps Script responde HTML quando a implantação está como "somente
      // eu" ou exige login — nunca é falta de rede.
      throw falha("a URL do Apps Script não devolveu JSON (HTTP " + r.status +
        "). Confira a implantação: tipo App da Web, acesso 'Qualquer pessoa'.", "servidor");
    }
    if (j.ok !== true) {
      throw falha(String(j.erro || j.mensagem || "recusado sem explicar o motivo"), "servidor");
    }
    return j;
  }

  function novoTS() {
    return String(Date.now()) + "-" + Math.floor(1000 + (window.crypto ? crypto.getRandomValues(new Uint32Array(1))[0] % 9000 : 0));
  }

  // Marca 1 penalidade em TEMPO REAL. Retorna o TS (para desfazer).
  // Em falha de rede, entra na fila e é reenviado no próximo polling.
  async function marcarPenalidade(info) {
    if (!CFG.ENDPOINT_APPS_SCRIPT) { setStatus("CONFIGURE ENDPOINT_APPS_SCRIPT", "erro"); throw new Error("Endpoint não configurado"); }
    var p = penaltyByKey(info.penaltyKey);
    if (!p) throw new Error("Penalidade inválida: " + info.penaltyKey);
    var ts = novoTS();
    var dados = {
      tipo: "penalidade", ts: ts, dataHora: new Date().toLocaleString("pt-BR"),
      avaliador: info.avaliador, candidatoId: info.candidatoId, candidato: info.candidato,
      tipoPenalidade: p.nome, pontos: isEliminatoria(p) ? "ELIMINATORIO" : p.pontos
    };
    setStatus("SALVANDO…", "busy");
    try {
      await postJson(dados);
      setStatus("SALVO ✅ " + horaAgora(), "ok");
    } catch (e) {
      // A marcação nunca é descartada: vai para a fila e é reenviada no
      // próximo ciclo, inclusive depois de a implantação ser corrigida.
      var fila = lerFila(); fila.push(dados); salvarFila(fila);
      if (e.tipoFalha === "servidor") {
        console.error("[CONDUTORES] O servidor RECUSOU a marcação:", e.message, dados);
        setStatus("⚠ SERVIDOR RECUSOU — NA FILA (" + fila.length + "): " + e.message, "erro");
        avisarUmaVez(
          "A marcação NÃO foi gravada na planilha.\n\n" +
          "O servidor respondeu: " + e.message + "\n\n" +
          "Isso NÃO é falta de internet. A causa mais comum é a URL do Apps Script " +
          "estar servindo o script de outro app — veja PROXIMOS_PASSOS.md.\n\n" +
          "As marcações ficam guardadas neste aparelho e são enviadas sozinhas " +
          "assim que a implantação for corrigida.");
      } else {
        setStatus("SEM CONEXÃO — NA FILA (" + fila.length + ")", "erro");
      }
    }
    return ts;
  }

  async function removerPenalidade(ts) {
    if (!ts) return;
    // Se ainda está na fila (não enviada), remove de lá
    var fila = lerFila();
    var idx = fila.findIndex(function (d) { return d.tipo === "penalidade" && d.ts === ts; });
    if (idx >= 0) { fila.splice(idx, 1); salvarFila(fila); setStatus("REMOVIDO (fila) " + horaAgora(), "ok"); return; }
    setStatus("REMOVENDO…", "busy");
    try {
      await postJson({ tipo: "removerPenalidade", ts: ts });
      setStatus("REMOVIDO ✅ " + horaAgora(), "ok");
    } catch (e) {
      setStatus("FALHA AO REMOVER — " + horaAgora(), "erro");
      throw e;
    }
  }

  async function salvarTempo(candidatoId, tempo, status) {
    setStatus("SALVANDO TEMPO…", "busy");
    await postJson({ tipo: "tempo", candidatoId: candidatoId, tempo: tempo, status: status || "" });
    setStatus("TEMPO SALVO ✅ " + horaAgora(), "ok");
  }

  async function salvarCandidato(cand) {
    setStatus("SALVANDO CADASTRO…", "busy");
    await postJson({
      tipo: "candidato", id: cand.id, nomeGuerra: cand.nome,
      matricula: cand.matricula, ativo: cand.ativo
    });
    setStatus("CADASTRO SALVO ✅ " + horaAgora(), "ok");
  }

  async function removerCandidato(id) {
    setStatus("REMOVENDO CADASTRO…", "busy");
    await postJson({ tipo: "removerCandidato", id: id });
    setStatus("CADASTRO REMOVIDO ✅ " + horaAgora(), "ok");
  }

  async function reenviarPendentes() {
    if (!CFG.ENDPOINT_APPS_SCRIPT) return;
    var fila = quarentenarVencidas();
    if (!fila.length) return;
    var restantes = [], motivo = null;
    for (var i = 0; i < fila.length; i++) {
      try { await postJson(fila[i]); }
      catch (e) { motivo = e; restantes = restantes.concat(fila.slice(i)); break; }
    }
    salvarFila(restantes);
    if (fila.length && !restantes.length) {
      setStatus("FILA ENVIADA ✅ " + horaAgora(), "ok");
    } else if (restantes.length) {
      // Antes só aparecia o número, e a fila podia ficar parada por horas
      // sem ninguém saber por quê.
      if (motivo && motivo.tipoFalha === "servidor") {
        console.error("[CONDUTORES] Fila parada — o servidor recusa:", motivo.message);
        setStatus("⚠ FILA PARADA (" + restantes.length + ") — SERVIDOR RECUSA: " + motivo.message, "erro");
      } else {
        setStatus("PENDENTES NA FILA: " + restantes.length + " (sem conexão)", "erro");
      }
    }
  }

  /* ---------------- Acesso do Chefe da Avaliação (PIN) ----------------
     Dificultador de acesso casual às telas administrativas
     (cadastro, dashboard/tempo, configurações). Não é segurança
     real — o app é estático, sem servidor de autenticação; o PIN
     fica no js/config.js e é visível a quem inspecionar o código. */
  var PIN_KEY = "condutores_chefe_ok";

  function pinValidado() {
    return localStorage.getItem(PIN_KEY) === "sim";
  }

  function sairChefe() {
    localStorage.removeItem(PIN_KEY);
    window.location.href = "index.html";
  }

  // Bloqueia a página com um overlay até o PIN correto ser digitado.
  // Retorna uma Promise que resolve quando o acesso é liberado.
  function pedirPin() {
    return new Promise(function (resolve) {
      if (pinValidado()) { resolve(); return; }

      var overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:9999;background:#000;display:flex;" +
        "align-items:center;justify-content:center;padding:24px;";

      var card = document.createElement("form");
      card.style.cssText =
        "background:#fff;color:#000;max-width:340px;width:100%;padding:32px;" +
        "font-family:'Public Sans',sans-serif;";

      var titulo = el("h2", null, "ÁREA RESTRITA");
      titulo.style.cssText = "font-weight:900;font-size:22px;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:4px;";

      var sub = el("p", null, "Acesso do Chefe da Avaliação");
      sub.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;color:#5e5e5e;margin-bottom:20px;letter-spacing:.05em;";

      var input = document.createElement("input");
      input.type = "password"; input.inputMode = "numeric"; input.required = true; input.placeholder = "PIN";
      input.style.cssText =
        "width:100%;border:2px solid #000;padding:14px;font-weight:900;font-size:26px;" +
        "letter-spacing:.4em;text-align:center;margin-bottom:10px;";

      var erro = el("p", null, "");
      erro.style.cssText = "color:#ba1a1a;font-size:11px;font-weight:900;text-transform:uppercase;min-height:16px;margin-bottom:10px;text-align:center;";

      var btn = document.createElement("button");
      btn.type = "submit"; btn.textContent = "ENTRAR";
      btn.style.cssText = "width:100%;background:#000;color:#fff;font-weight:900;padding:14px;text-transform:uppercase;letter-spacing:.1em;cursor:pointer;";

      card.append(titulo, sub, input, erro, btn);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      setTimeout(function () { input.focus(); }, 50);

      card.addEventListener("submit", function (ev) {
        ev.preventDefault();
        if (input.value === String(CFG.PIN_CHEFE)) {
          localStorage.setItem(PIN_KEY, "sim");
          overlay.remove();
          resolve();
        } else {
          erro.textContent = "PIN INCORRETO";
          input.value = "";
          input.focus();
        }
      });
    });
  }

  /* ---------------- DOM seguro ---------------- */
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  window.AppUtils = {
    timeToSeconds: timeToSeconds, isValidTime: isValidTime, horaAgora: horaAgora, fmtHoje: fmtHoje,
    penaltyByKey: penaltyByKey, penaltyByNome: penaltyByNome, isEliminatoria: isEliminatoria, pontosPenalidades: pontosPenalidades,
    temEliminatoria: temEliminatoria, avaliarFormula: avaliarFormula, formulaSubstituida: formulaSubstituida,
    pontuacaoTempo: pontuacaoTempo, calcularResultado: calcularResultado,
    parseCSV: parseCSV, csvParaObjetos: csvParaObjetos,
    parseCandidatos: parseCandidatos, parseRegistros: parseRegistros, parseResultados: parseResultados,
    montarCandidatos: montarCandidatos, classificarRanking: classificarRanking,
    penalidadesDesconhecidas: penalidadesDesconhecidas,
    candidatoAtivo: candidatoAtivo, marcadoSim: marcadoSim,
    normalizarCategoria: normalizarCategoria,
    distribuirVagas: distribuirVagas, posicoesPorCategoria: posicoesPorCategoria,
    setStatus: setStatus, iniciarPolling: iniciarPolling,
    marcarPenalidade: marcarPenalidade, removerPenalidade: removerPenalidade,
    salvarTempo: salvarTempo, salvarCandidato: salvarCandidato, removerCandidato: removerCandidato,
    reenviarPendentes: reenviarPendentes, lerFila: lerFila,
    lerFilaVencida: function () {
      try { return JSON.parse(localStorage.getItem(FILA_VENCIDA_KEY)) || []; } catch (e) { return []; }
    },
    limparFilaVencida: function () { localStorage.removeItem(FILA_VENCIDA_KEY); },
    el: el,
    pedirPin: pedirPin, sairChefe: sairChefe
  };
})();
