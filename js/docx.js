/* =========================================================
   Gerador de .docx no próprio navegador — sem biblioteca,
   sem build, sem servidor.

   Um .docx é um ZIP com XML dentro (OOXML). Aqui o ZIP é
   escrito à mão no modo STORE (sem compressão), que é o
   único que dá para produzir sem um compressor: o arquivo
   fica alguns KB maiores e abre igual no Word, no
   LibreOffice e no editor do SEI.

   Uso:
     var doc = AppDocx.novo();
     doc.titulo("...");            doc.subtitulo("...");
     doc.secao("...");             doc.paragrafo("...");
     doc.tabela([[a, b], ...], { cabecalho: true, larguras: [34, 66] });
     AppDocx.baixar(doc, "nome.docx");

   Expõe window.AppDocx. Não depende de js/config.js.
   ========================================================= */
(function () {
  "use strict";

  /* ---------------- ZIP (STORE) ---------------- */

  var TABELA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(texto) { return new TextEncoder().encode(texto); }

  // Data/hora no formato MS-DOS que o cabeçalho do ZIP exige.
  function dataDos(d) {
    return {
      hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2)),
      data: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function escritor() {
    var partes = [], tamanho = 0;
    return {
      get tamanho() { return tamanho; },
      push: function (bytes) { partes.push(bytes); tamanho += bytes.length; },
      u16: function (v) { this.push(new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF])); },
      u32: function (v) {
        this.push(new Uint8Array([v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]));
      },
      blob: function (tipo) { return new Blob(partes, { type: tipo }); }
    };
  }

  /* arquivos: [{ nome, texto }] → Blob do ZIP */
  function zipar(arquivos, tipoMime) {
    var agora = dataDos(new Date());
    var saida = escritor();
    var central = [];

    arquivos.forEach(function (arq) {
      var nome = utf8(arq.nome);
      var conteudo = utf8(arq.texto);
      var crc = crc32(conteudo);
      var deslocamento = saida.tamanho;

      // Cabeçalho local. Bit 11 das flags = nomes em UTF-8.
      saida.u32(0x04034B50); saida.u16(20); saida.u16(0x0800); saida.u16(0);
      saida.u16(agora.hora); saida.u16(agora.data);
      saida.u32(crc); saida.u32(conteudo.length); saida.u32(conteudo.length);
      saida.u16(nome.length); saida.u16(0);
      saida.push(nome); saida.push(conteudo);

      central.push({ nome: nome, crc: crc, tamanho: conteudo.length, deslocamento: deslocamento });
    });

    var inicioCentral = saida.tamanho;
    central.forEach(function (e) {
      saida.u32(0x02014B50); saida.u16(20); saida.u16(20); saida.u16(0x0800); saida.u16(0);
      saida.u16(agora.hora); saida.u16(agora.data);
      saida.u32(e.crc); saida.u32(e.tamanho); saida.u32(e.tamanho);
      saida.u16(e.nome.length); saida.u16(0); saida.u16(0);
      saida.u16(0); saida.u16(0); saida.u32(0); saida.u32(e.deslocamento);
      saida.push(e.nome);
    });

    var tamanhoCentral = saida.tamanho - inicioCentral;
    saida.u32(0x06054B50); saida.u16(0); saida.u16(0);
    saida.u16(central.length); saida.u16(central.length);
    saida.u32(tamanhoCentral); saida.u32(inicioCentral); saida.u16(0);

    return saida.blob(tipoMime);
  }

  /* ---------------- OOXML ---------------- */

  var NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  function esc(texto) {
    return String(texto === null || texto === undefined ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ⚠ A ORDEM dos filhos de <w:rPr> e <w:pPr> não é livre: o schema do
     OOXML (CT_RPr / CT_PPrBase) define uma sequência fixa, e um parser
     estrito — o do LibreOffice, por exemplo — recusa o arquivo inteiro
     com "source file could not be loaded" se a ordem estiver trocada.
     O ZIP e o XML podem estar perfeitos e o documento ainda não abrir.
     Emitir sempre na ordem abaixo, e acrescentar campo novo no lugar
     certo da sequência, não no fim. */

  // CT_RPr: … b, … caps, … color, … sz …
  function run(texto, op) {
    op = op || {};
    var props = "";
    if (op.negrito) props += "<w:b/>";
    if (op.maiusculas) props += "<w:caps/>";
    if (op.cor) props += '<w:color w:val="' + op.cor + '"/>';
    if (op.tamanho) props += '<w:sz w:val="' + (op.tamanho * 2) + '"/>';
    return "<w:r>" + (props ? "<w:rPr>" + props + "</w:rPr>" : "") +
      '<w:t xml:space="preserve">' + esc(texto) + "</w:t></w:r>";
  }

  // CT_PPrBase: … pBdr, shd, … spacing, … jc …
  function paragrafo(texto, op) {
    op = op || {};
    var props = "";
    if (op.borda) props += '<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="2" w:color="000000"/></w:pBdr>';
    if (op.sombreado) props += '<w:shd w:val="clear" w:fill="' + op.sombreado + '"/>';
    if (op.antes || op.depois) {
      props += '<w:spacing' + (op.antes ? ' w:before="' + op.antes + '"' : "") +
        (op.depois ? ' w:after="' + op.depois + '"' : "") + "/>";
    }
    if (op.alinhamento) props += '<w:jc w:val="' + op.alinhamento + '"/>';
    return "<w:p>" + (props ? "<w:pPr>" + props + "</w:pPr>" : "") +
      (texto === "" ? "" : run(texto, op)) + "</w:p>";
  }

  function celula(conteudo, larguraPct, op) {
    op = op || {};
    var props = '<w:tcW w:w="' + Math.round(larguraPct * 50) + '" w:type="pct"/>';
    if (op.sombreado) props += '<w:shd w:val="clear" w:fill="' + op.sombreado + '"/>';
    props += "<w:vAlign w:val=\"center\"/>";
    return "<w:tc><w:tcPr>" + props + "</w:tcPr>" + conteudo + "</w:tc>";
  }

  var BORDAS_TABELA =
    "<w:tblBorders>" +
    ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (b) {
      return "<w:" + b + ' w:val="single" w:sz="6" w:space="0" w:color="000000"/>';
    }).join("") + "</w:tblBorders>";

  // Largura útil da página em twips: A4 (11906) menos as duas margens
  // de 1134 configuradas no sectPr.
  var LARGURA_UTIL = 11906 - 1134 * 2;

  /* <w:tblGrid> é OBRIGATÓRIO em CT_Tbl, logo depois de <w:tblPr>.
     Sem ele o LibreOffice recusa o documento inteiro com "source file
     could not be loaded" — o XML fica bem formado, mas inválido. */
  function grade(larguras) {
    return "<w:tblGrid>" + larguras.map(function (p) {
      return '<w:gridCol w:w="' + Math.round(LARGURA_UTIL * p / 100) + '"/>';
    }).join("") + "</w:tblGrid>";
  }

  function aberturaTabela(larguras) {
    return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>' + BORDAS_TABELA +
      '<w:tblLayout w:type="fixed"/></w:tblPr>' + grade(larguras);
  }

  /* ---------------- API pública ---------------- */

  function novo() {
    var corpo = [];
    var api = {
      titulo: function (texto) {
        corpo.push(paragrafo(texto, { negrito: true, tamanho: 14, maiusculas: true, depois: 40 }));
        return api;
      },
      subtitulo: function (texto) {
        corpo.push(paragrafo(texto, { tamanho: 9, maiusculas: true, cor: "5E5E5E", depois: 20 }));
        return api;
      },
      secao: function (texto) {
        corpo.push(paragrafo(texto, {
          negrito: true, tamanho: 10, maiusculas: true, antes: 240, depois: 80, borda: true
        }));
        return api;
      },
      paragrafo: function (texto, op) { corpo.push(paragrafo(texto, op || { tamanho: 10 })); return api; },
      espaco: function () { corpo.push(paragrafo("")); return api; },

      /* linhas: matriz de strings. Opções:
         cabecalho  — primeira linha em negrito com fundo cinza
         total      — última linha em negrito
         larguras   — porcentagens por coluna (soma 100)
         centradas  — índices de coluna centralizados */
      tabela: function (linhas, op) {
        op = op || {};
        var nCols = linhas[0].length;
        var larguras = op.larguras || linhas[0].map(function () { return 100 / nCols; });
        var centradas = op.centradas || [];

        var xml = aberturaTabela(larguras);
        linhas.forEach(function (linha, iLinha) {
          var destaque = (op.cabecalho && iLinha === 0) || (op.total && iLinha === linhas.length - 1);
          xml += "<w:tr>";
          linha.forEach(function (valor, iCol) {
            var p = paragrafo(valor, {
              negrito: destaque,
              tamanho: 9,
              alinhamento: centradas.indexOf(iCol) >= 0 ? "center" : null,
              antes: 20, depois: 20
            });
            xml += celula(p, larguras[iCol], destaque ? { sombreado: "EFEFEF" } : {});
          });
          xml += "</w:tr>";
        });
        return (corpo.push(xml + "</w:tbl>"), api);
      },

      /* Tabela rótulo → valor, o formato mais comum aqui. */
      ficha: function (pares) {
        var xml = aberturaTabela([34, 66]);
        pares.forEach(function (par) {
          xml += "<w:tr>" +
            celula(paragrafo(par[0], { tamanho: 9, cor: "5E5E5E", antes: 20, depois: 20 }), 34) +
            celula(paragrafo(par[1], { tamanho: 10, negrito: true, antes: 20, depois: 20 }), 66) +
            "</w:tr>";
        });
        return (corpo.push(xml + "</w:tbl>"), api);
      },

      xml: function () {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:document xmlns:w="' + NS_W + '"><w:body>' + corpo.join("") +
          '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
          '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" ' +
          'w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>' +
          "</w:body></w:document>";
      }
    };
    return api;
  }

  var TIPO_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  function gerarBlob(doc) {
    return zipar([
      {
        nome: "[Content_Types].xml",
        texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="' + TIPO_DOCX + '.main+xml"/>' +
          "</Types>"
      },
      {
        nome: "_rels/.rels",
        texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Target="word/document.xml" ' +
          'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/>' +
          "</Relationships>"
      },
      {
        // Vazio, mas presente: alguns leitores procuram este arquivo
        // mesmo quando o documento não referencia nada externo.
        nome: "word/_rels/document.xml.rels",
        texto: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
      },
      { nome: "word/document.xml", texto: doc.xml() }
    ], TIPO_DOCX);
  }

  function baixar(doc, nomeArquivo) {
    var url = URL.createObjectURL(gerarBlob(doc));
    var a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revogar na hora quebra o download em alguns navegadores.
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  window.AppDocx = { novo: novo, baixar: baixar, gerarBlob: gerarBlob };
})();
