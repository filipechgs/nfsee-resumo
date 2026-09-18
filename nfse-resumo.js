/**
 * NFS-e Resumo
 *
 * Soma os valores das notas emitidas, filtra por mês/ano e exporta CSV/PDF.
 * Use na página NFS-e Emitidas do Portal Nacional (cole no Console ou
 * ative pelo favorito / Tampermonkey).
 */
(function () {
  "use strict";

  var PREFIX = "nfse-ext";
  var STYLE_ID = PREFIX + "-styles";
  var BTN_ID = PREFIX + "-btn-export";
  var BTN_ANO_ID = PREFIX + "-btn-ano";
  var TOTAL_ID = PREFIX + "-total";
  var FILTRO_ID = PREFIX + "-filtro-mes";
  var MODAL_ID = PREFIX + "-modal-ano";
  var CHECK_CLASS = PREFIX + "-check";
  var COL_CLASS = PREFIX + "-col-check";

  var MESES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  var cacheAno = { ano: null, notas: null };

  function cleanup() {
    var style = document.getElementById(STYLE_ID);
    if (style) style.remove();

    [BTN_ID, BTN_ANO_ID].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      var li = btn.closest("li");
      if (li) li.remove();
      else btn.remove();
    });

    var total = document.getElementById(TOTAL_ID);
    if (total) total.remove();

    var filtro = document.getElementById(FILTRO_ID);
    if (filtro) filtro.remove();

    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();

    document.querySelectorAll("." + COL_CLASS).forEach(function (el) {
      el.remove();
    });
  }

  function injectStyles() {
    var css = [
      "#" + BTN_ID + ",#" + BTN_ANO_ID + "{display:inline-flex;align-items:center;gap:8px;margin-left:8px;}",
      "." + COL_CLASS + "{width:36px;text-align:center;vertical-align:middle;}",
      "." + COL_CLASS + " input[type=checkbox]{width:16px;height:16px;cursor:pointer;margin:0;}",
      "#" + TOTAL_ID + "{margin:12px 0 16px;padding:12px 16px;background:#e8f4fc;border:1px solid #b8d4e8;border-radius:4px;font-size:15px;line-height:1.5;color:#1a3a52;}",
      "#" + TOTAL_ID + " strong{font-size:17px;}",
      "#" + FILTRO_ID + "{display:flex;align-items:flex-end;flex-wrap:wrap;gap:12px;margin:12px 0 8px;padding:12px 16px;background:#f7fafc;border:1px solid #d0dce6;border-radius:4px;}",
      "#" + FILTRO_ID + " .nfse-ext-filtro-group{display:flex;flex-direction:column;gap:4px;}",
      "#" + FILTRO_ID + " label{font-size:12px;font-weight:600;color:#334;margin:0;}",
      "#" + FILTRO_ID + " select{min-width:140px;height:38px;padding:4px 8px;font-size:14px;border:1px solid #ccc;border-radius:4px;background:#fff;}",
      "#" + FILTRO_ID + " .nfse-ext-btn-pesquisar{height:38px;padding:0 16px;font-size:14px;font-weight:600;border:none;border-radius:4px;background:#1a6fb5;color:#fff;cursor:pointer;}",
      "#" + FILTRO_ID + " .nfse-ext-btn-pesquisar:hover{background:#155a94;}",
      "#" + MODAL_ID + "{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;}",
      "#" + MODAL_ID + " .nfse-ext-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45);}",
      "#" + MODAL_ID + " .nfse-ext-dialog{position:relative;background:#fff;color:#222;border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,.25);width:min(480px,calc(100vw - 32px));padding:24px;z-index:1;}",
      "#" + MODAL_ID + " h3{margin:0 0 12px;font-size:20px;}",
      "#" + MODAL_ID + " .nfse-ext-status{margin:0 0 16px;font-size:14px;line-height:1.5;color:#333;min-height:3em;}",
      "#" + MODAL_ID + " .nfse-ext-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;}",
      "#" + MODAL_ID + " button{border:none;border-radius:4px;padding:10px 16px;font-size:14px;cursor:pointer;}",
      "#" + MODAL_ID + " button:disabled{opacity:.55;cursor:not-allowed;}",
      "#" + MODAL_ID + " .nfse-ext-btn-primary{background:#1a6fb5;color:#fff;}",
      "#" + MODAL_ID + " .nfse-ext-btn-secondary{background:#e8e8e8;color:#333;}",
      "#" + MODAL_ID + " .nfse-ext-close{position:absolute;top:10px;right:12px;background:transparent;border:none;font-size:22px;line-height:1;color:#666;cursor:pointer;padding:4px 8px;}",
    ].join("");

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function parseValorBR(texto) {
    if (!texto) return 0;
    var limpo = String(texto).trim().replace(/\./g, "").replace(",", ".");
    var n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
  }

  function formatValorBR(n) {
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function textOf(el) {
    return el ? el.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function getTabela() {
    return document.querySelector("table.table.table-striped");
  }

  function getLinhasNotas(tabela) {
    if (!tabela) return [];
    return Array.prototype.slice.call(
      tabela.querySelectorAll("tbody tr[data-valor]")
    );
  }

  function extrairDocumentoNome(td) {
    if (!td) return { documento: "", nome: "", completo: "" };
    var docEl = td.querySelector(".cpf, .cnpj");
    var documento = docEl ? textOf(docEl) : "";
    var completo = textOf(td);
    var nome = completo;
    if (documento) {
      nome = completo
        .replace(documento, "")
        .replace(/^[\s\-–—]+/, "")
        .trim();
    }
    return { documento: documento, nome: nome, completo: completo };
  }

  function extrairNumeroNfse(tr) {
    var link = tr.querySelector('a[href*="/Notas/Visualizar/"]');
    if (!link) return "";
    var parts = link.getAttribute("href").split("/");
    return parts[parts.length - 1] || "";
  }

  function extrairSituacao(tr) {
    var img = tr.querySelector(".td-situacao img");
    if (!img) return "";
    return (
      img.getAttribute("alt") ||
      img.getAttribute("data-original-title") ||
      img.getAttribute("title") ||
      ""
    );
  }

  function coletarNotas(tabela) {
    return getLinhasNotas(tabela).map(function (tr) {
      var tomador = extrairDocumentoNome(tr.querySelector(".td-texto-grande"));
      return {
        data: textOf(tr.querySelector(".td-data")),
        documento: tomador.documento,
        nome: tomador.nome,
        emitidaPara: tomador.completo,
        competencia: textOf(tr.querySelector(".td-competencia")),
        municipio: textOf(tr.querySelector(".td-center")),
        valorTexto:
          tr.getAttribute("data-valor") || textOf(tr.querySelector(".td-valor")),
        valor: parseValorBR(tr.getAttribute("data-valor")),
        situacao: extrairSituacao(tr),
        numero: extrairNumeroNfse(tr),
      };
    });
  }

  function somarNotas(notas) {
    return notas.reduce(function (acc, n) {
      return acc + n.valor;
    }, 0);
  }

  function chaveNota(n) {
    return n.numero || [n.data, n.documento, n.valorTexto, n.nome].join("|");
  }

  function deduplicarNotas(lista) {
    var vistos = Object.create(null);
    var out = [];
    lista.forEach(function (n) {
      var k = chaveNota(n);
      if (vistos[k]) return;
      vistos[k] = true;
      out.push(n);
    });
    return out;
  }

  function ordenarNotas(lista) {
    return lista.slice().sort(function (a, b) {
      var da = parseDataBR(a.data);
      var db = parseDataBR(b.data);
      if (da && db) {
        var ta = da.ano * 10000 + da.mes * 100 + da.dia;
        var tb = db.ano * 10000 + db.mes * 100 + db.dia;
        if (ta !== tb) return ta - tb;
      }
      return String(a.numero).localeCompare(String(b.numero));
    });
  }

  function csvEscape(valor) {
    var s = valor == null ? "" : String(valor);
    if (/[",\n\r]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function gerarCsv(notas) {
    var header = [
      "Data",
      "Documento",
      "Emitida para",
      "Competência",
      "Município",
      "Valor",
      "Situação",
      "Número NFS-e",
    ];
    var linhas = [header.join(",")];
    notas.forEach(function (n) {
      linhas.push(
        [
          csvEscape(n.data),
          csvEscape(n.documento),
          csvEscape(n.nome),
          csvEscape(n.competencia),
          csvEscape(n.municipio),
          csvEscape(n.valorTexto),
          csvEscape(n.situacao),
          csvEscape(n.numero),
        ].join(",")
      );
    });
    return "\uFEFF" + linhas.join("\r\n");
  }

  function baixarArquivo(conteudo, nome, mime) {
    var blob = new Blob([conteudo], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function baixarCsv(notas, nomeArquivo) {
    baixarArquivo(
      gerarCsv(notas),
      nomeArquivo || "nfse-emitidas.csv",
      "text/csv;charset=utf-8;"
    );
  }

  function gerarPdf(notas, ano) {
    var total = somarNotas(notas);
    var linhas = notas
      .map(function (n) {
        return (
          "<tr>" +
          "<td>" +
          escHtml(n.data) +
          "</td>" +
          "<td>" +
          escHtml(n.documento) +
          "</td>" +
          "<td>" +
          escHtml(n.nome) +
          "</td>" +
          "<td>" +
          escHtml(n.competencia) +
          "</td>" +
          "<td>" +
          escHtml(n.municipio) +
          "</td>" +
          '<td style="text-align:right">' +
          escHtml(n.valorTexto) +
          "</td>" +
          "<td>" +
          escHtml(n.situacao) +
          "</td>" +
          "<td>" +
          escHtml(n.numero) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    var html =
      "<!DOCTYPE html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
      "<title>NFS-e Emitidas " +
      ano +
      "</title>" +
      "<style>" +
      "body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:24px;}" +
      "h1{font-size:18px;margin:0 0 8px;}" +
      ".meta{margin-bottom:16px;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "th,td{border:1px solid #ccc;padding:4px 6px;vertical-align:top;}" +
      "th{background:#eee;text-align:left;}" +
      "@media print{body{margin:12px;} .no-print{display:none;}}" +
      "</style></head><body>" +
      "<h1>NFS-e Emitidas — " +
      ano +
      "</h1>" +
      '<div class="meta">Quantidade: <strong>' +
      notas.length +
      "</strong> &nbsp;|&nbsp; Somatório: <strong>R$ " +
      formatValorBR(total) +
      "</strong></div>" +
      '<p class="no-print">Use a impressão do navegador e escolha &quot;Salvar como PDF&quot;.</p>' +
      "<table><thead><tr>" +
      "<th>Data</th><th>Documento</th><th>Emitida para</th><th>Competência</th>" +
      "<th>Município</th><th>Valor</th><th>Situação</th><th>Número NFS-e</th>" +
      "</tr></thead><tbody>" +
      linhas +
      "</tbody></table>" +
      "<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\\/script>" +
      "</body></html>";

    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var blobUrl = URL.createObjectURL(blob);
    var win = window.open(blobUrl, "_blank");
    if (!win) {
      URL.revokeObjectURL(blobUrl);
      alert(
        "Não foi possível abrir a janela do PDF. Permita pop-ups para este site."
      );
      return;
    }
    setTimeout(function () {
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ultimoDiaDoMes(ano, mes) {
    return new Date(ano, mes, 0).getDate();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatarDataBR(dia, mes, ano) {
    return pad2(dia) + "/" + pad2(mes) + "/" + ano;
  }

  function parseDataBR(texto) {
    var m = String(texto || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return {
      dia: parseInt(m[1], 10),
      mes: parseInt(m[2], 10),
      ano: parseInt(m[3], 10),
    };
  }

  function definirCampoData(id, valor) {
    var input = document.getElementById(id);
    if (!input) return;
    input.value = valor;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function aplicarPeriodoMes(ano, mes) {
    var ultimo = ultimoDiaDoMes(ano, mes);
    definirCampoData("datainicio", formatarDataBR(1, mes, ano));
    definirCampoData("datafim", formatarDataBR(ultimo, mes, ano));
  }

  function mesAnoIniciais() {
    var inicio = parseDataBR(
      (document.getElementById("datainicio") || {}).value
    );
    if (inicio) {
      return { mes: inicio.mes, ano: inicio.ano };
    }
    var hoje = new Date();
    return { mes: hoje.getMonth() + 1, ano: hoje.getFullYear() };
  }

  function anoSelecionado() {
    var sel = document.getElementById(PREFIX + "-ano");
    if (sel && sel.value) return parseInt(sel.value, 10);
    return mesAnoIniciais().ano;
  }

  /**
   * Períodos de no máximo 30 dias (limite do portal).
   * Meses com 31 dias: 01–30 e 31–31.
   */
  function periodosDoMes(ano, mes) {
    var ultimo = ultimoDiaDoMes(ano, mes);
    if (ultimo <= 30) {
      return [
        {
          inicio: formatarDataBR(1, mes, ano),
          fim: formatarDataBR(ultimo, mes, ano),
        },
      ];
    }
    return [
      {
        inicio: formatarDataBR(1, mes, ano),
        fim: formatarDataBR(30, mes, ano),
      },
      {
        inicio: formatarDataBR(31, mes, ano),
        fim: formatarDataBR(31, mes, ano),
      },
    ];
  }

  function periodosDoAno(ano) {
    var periodos = [];
    for (var mes = 1; mes <= 12; mes++) {
      periodos = periodos.concat(periodosDoMes(ano, mes));
    }
    return periodos;
  }

  function caminhoEmitidas() {
    var form = document.querySelector("#pnlComandos form.navbar-form[action]");
    var action = form && form.getAttribute("action");
    if (action && action.indexOf("javascript:") !== 0) {
      return action;
    }
    // Usa o caminho atual (respeita maiúsculas do portal)
    if (/\/Notas\/Emitidas/i.test(location.pathname)) {
      return location.pathname;
    }
    return "/EmissorNacional/Notas/Emitidas";
  }

  function urlEmitidas(datainicio, datafim) {
    var url = new URL(caminhoEmitidas(), location.href);
    url.search = "";
    url.searchParams.set("datainicio", datainicio);
    url.searchParams.set("datafim", datafim);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("URL inválida para busca: " + url.href);
    }
    return url.href;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function coletarNotasDeDocumento(doc) {
    if (!doc) return [];
    var tabela = doc.querySelector("table.table.table-striped");
    return coletarNotas(tabela);
  }

  function ehUrlHttpMesmaOrigem(href) {
    try {
      var u = new URL(href, location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      if (u.origin !== location.origin) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function urlsPaginacao(doc, urlBasePeriodo) {
    var links = doc.querySelectorAll(".paginacao a[href]");
    var urls = [];
    var vistos = Object.create(null);
    vistos[urlBasePeriodo] = true;
    Array.prototype.forEach.call(links, function (a) {
      var raw = a.getAttribute("href") || "";
      if (!raw || raw.indexOf("javascript:") === 0 || raw.charAt(0) === "#") {
        return;
      }
      try {
        var abs = new URL(raw, location.href).href;
        if (!ehUrlHttpMesmaOrigem(abs) || vistos[abs]) return;
        vistos[abs] = true;
        urls.push(abs);
      } catch (e) {
        /* ignore */
      }
    });
    return urls;
  }

  async function fetchHtml(url) {
    if (!ehUrlHttpMesmaOrigem(url)) {
      throw new Error("URL bloqueada (não http mesma origem): " + url);
    }
    var resp = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!resp.ok) {
      throw new Error("HTTP " + resp.status + " ao buscar " + url);
    }
    return resp.text();
  }

  async function buscarNotasPeriodo(datainicio, datafim) {
    var url = urlEmitidas(datainicio, datafim);
    var html = await fetchHtml(url);
    var doc = new DOMParser().parseFromString(html, "text/html");
    var notas = coletarNotasDeDocumento(doc);

    var paginas = urlsPaginacao(doc, url);
    for (var i = 0; i < paginas.length; i++) {
      await sleep(300);
      var htmlPag = await fetchHtml(paginas[i]);
      var docPag = new DOMParser().parseFromString(htmlPag, "text/html");
      notas = notas.concat(coletarNotasDeDocumento(docPag));
    }
    return notas;
  }

  async function buscarNotasDoAno(ano, onProgresso) {
    var periodos = periodosDoAno(ano);
    var todas = [];
    for (var i = 0; i < periodos.length; i++) {
      var p = periodos[i];
      if (onProgresso) {
        onProgresso(
          "Buscando " +
            p.inicio +
            " a " +
            p.fim +
            " (" +
            (i + 1) +
            "/" +
            periodos.length +
            ")…"
        );
      }
      var lote = await buscarNotasPeriodo(p.inicio, p.fim);
      todas = todas.concat(lote);
      await sleep(400);
    }
    return ordenarNotas(deduplicarNotas(todas));
  }

  function injetarCheckboxes(tabela) {
    var theadRow = tabela.querySelector("thead tr");
    if (theadRow && !theadRow.querySelector("." + COL_CLASS)) {
      var th = document.createElement("th");
      th.className = COL_CLASS;
      var master = document.createElement("input");
      master.type = "checkbox";
      master.className = CHECK_CLASS + "-master";
      master.title = "Marcar / desmarcar todos";
      master.setAttribute("aria-label", "Marcar ou desmarcar todas as notas");
      master.addEventListener("change", function () {
        var checked = master.checked;
        tabela.querySelectorAll("tbody ." + CHECK_CLASS).forEach(function (cb) {
          cb.checked = checked;
        });
      });
      th.appendChild(master);
      theadRow.insertBefore(th, theadRow.firstChild);
    }

    getLinhasNotas(tabela).forEach(function (tr) {
      if (tr.querySelector("." + COL_CLASS)) return;
      var td = document.createElement("td");
      td.className = COL_CLASS;
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = CHECK_CLASS;
      cb.setAttribute("aria-label", "Selecionar nota");
      cb.addEventListener("change", function () {
        var master = tabela.querySelector("." + CHECK_CLASS + "-master");
        if (!master) return;
        var todos = tabela.querySelectorAll("tbody ." + CHECK_CLASS);
        var marcados = tabela.querySelectorAll(
          "tbody ." + CHECK_CLASS + ":checked"
        );
        master.checked = todos.length > 0 && marcados.length === todos.length;
        master.indeterminate =
          marcados.length > 0 && marcados.length < todos.length;
      });
      td.appendChild(cb);
      tr.insertBefore(td, tr.firstChild);
    });
  }

  function injetarTotal(tabela) {
    var notas = coletarNotas(tabela);
    var total = somarNotas(notas);

    var box = document.createElement("div");
    box.id = TOTAL_ID;
    box.innerHTML =
      "Notas na listagem: <strong>" +
      notas.length +
      "</strong>" +
      " &nbsp;|&nbsp; Somatório: <strong>R$ " +
      formatValorBR(total) +
      "</strong>";

    tabela.parentNode.insertBefore(box, tabela);
  }

  function injetarFiltroMesAno() {
    if (document.getElementById(FILTRO_ID)) return;
    if (
      !document.getElementById("datainicio") ||
      !document.getElementById("datafim")
    ) {
      console.warn(
        "[nfse-resumo] Campos datainicio/datafim não encontrados; filtro mês/ano não injetado."
      );
      return;
    }

    var iniciais = mesAnoIniciais();
    var anoAtual = new Date().getFullYear();
    var anos = [];
    for (var a = anoAtual - 10; a <= anoAtual + 1; a++) {
      anos.push(a);
    }
    if (anos.indexOf(iniciais.ano) === -1) {
      anos.push(iniciais.ano);
      anos.sort(function (x, y) {
        return x - y;
      });
    }

    var wrap = document.createElement("div");
    wrap.id = FILTRO_ID;

    var grupoMes = document.createElement("div");
    grupoMes.className = "nfse-ext-filtro-group";
    var labelMes = document.createElement("label");
    labelMes.htmlFor = PREFIX + "-mes";
    labelMes.textContent = "Mês";
    var selMes = document.createElement("select");
    selMes.id = PREFIX + "-mes";
    MESES.forEach(function (nome, i) {
      var opt = document.createElement("option");
      opt.value = String(i + 1);
      opt.textContent = nome;
      if (i + 1 === iniciais.mes) opt.selected = true;
      selMes.appendChild(opt);
    });
    grupoMes.appendChild(labelMes);
    grupoMes.appendChild(selMes);

    var grupoAno = document.createElement("div");
    grupoAno.className = "nfse-ext-filtro-group";
    var labelAno = document.createElement("label");
    labelAno.htmlFor = PREFIX + "-ano";
    labelAno.textContent = "Ano";
    var selAno = document.createElement("select");
    selAno.id = PREFIX + "-ano";
    anos.forEach(function (ano) {
      var opt = document.createElement("option");
      opt.value = String(ano);
      opt.textContent = String(ano);
      if (ano === iniciais.ano) opt.selected = true;
      selAno.appendChild(opt);
    });
    grupoAno.appendChild(labelAno);
    grupoAno.appendChild(selAno);

    function onPeriodoChange() {
      cacheAno = { ano: null, notas: null };
      aplicarPeriodoMes(parseInt(selAno.value, 10), parseInt(selMes.value, 10));
    }

    selMes.addEventListener("change", onPeriodoChange);
    selAno.addEventListener("change", onPeriodoChange);

    var grupoPesquisar = document.createElement("div");
    grupoPesquisar.className = "nfse-ext-filtro-group";
    var labelPesquisar = document.createElement("label");
    labelPesquisar.htmlFor = PREFIX + "-pesquisar";
    labelPesquisar.textContent = "\u00a0";
    var btnPesquisar = document.createElement("button");
    btnPesquisar.type = "button";
    btnPesquisar.id = PREFIX + "-pesquisar";
    btnPesquisar.className = "nfse-ext-btn-pesquisar";
    btnPesquisar.textContent = "Pesquisar";
    btnPesquisar.addEventListener("click", function () {
      onPeriodoChange();
      var form =
        (document.getElementById("pnlComandos") || document).querySelector(
          "form.navbar-form"
        ) || document.querySelector("#pnlComandos form");
      if (form) {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      } else {
        console.warn(
          "[nfse-resumo] Formulário de filtro não encontrado para pesquisar."
        );
      }
    });
    grupoPesquisar.appendChild(labelPesquisar);
    grupoPesquisar.appendChild(btnPesquisar);

    wrap.appendChild(grupoMes);
    wrap.appendChild(grupoAno);
    wrap.appendChild(grupoPesquisar);

    var painel = document.getElementById("pnlComandos");
    var form = painel && painel.querySelector("form.navbar-form");
    if (form) {
      form.appendChild(wrap);
    } else if (painel) {
      painel.appendChild(wrap);
    } else {
      var tabela = getTabela();
      if (tabela) tabela.parentNode.insertBefore(wrap, tabela);
    }
  }

  function appendBtnNaBarra(btn) {
    var painel = document.getElementById("pnlComandos");
    var lista = painel && painel.querySelector("ul.nav.navbar-nav");
    if (lista) {
      var li = document.createElement("li");
      li.appendChild(btn);
      lista.appendChild(li);
      return;
    }
    if (painel) {
      painel.appendChild(btn);
      return;
    }
    btn.style.position = "fixed";
    btn.style.bottom = "24px";
    btn.style.right = "24px";
    btn.style.zIndex = "99998";
    document.body.appendChild(btn);
  }

  function injetarBotaoCsv(tabela) {
    if (document.getElementById(BTN_ID)) return;

    var btn = document.createElement("a");
    btn.id = BTN_ID;
    btn.href = "javascript:void(0);";
    btn.className = "btn btn-lg btn-success";
    btn.innerHTML = "<span>Exportar CSV</span>";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var hoje = new Date();
      var nome =
        "nfse-emitidas-" +
        hoje.getFullYear() +
        "-" +
        pad2(hoje.getMonth() + 1) +
        "-" +
        pad2(hoje.getDate()) +
        ".csv";
      baixarCsv(coletarNotas(tabela), nome);
    });
    appendBtnNaBarra(btn);
  }

  function fecharModalAno() {
    var modal = document.getElementById(MODAL_ID);
    if (modal) modal.remove();
    document.removeEventListener("keydown", onEscapeAno);
  }

  function onEscapeAno(e) {
    if (e.key === "Escape") fecharModalAno();
  }

  function abrirModalAno() {
    fecharModalAno();

    var ano = anoSelecionado();
    var modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    modal.innerHTML =
      '<div class="nfse-ext-backdrop" data-close="1"></div>' +
      '<div class="nfse-ext-dialog">' +
      '<button type="button" class="nfse-ext-close" data-close="1" aria-label="Fechar">&times;</button>' +
      "<h3>Exportar ano " +
      ano +
      "</h3>" +
      '<div class="nfse-ext-status" id="' +
      PREFIX +
      '-ano-status">Clique em Buscar para percorrer todos os meses do ano (respeitando o limite de 30 dias do portal).</div>' +
      '<div class="nfse-ext-actions">' +
      '<button type="button" class="nfse-ext-btn-secondary" data-close="1">Fechar</button>' +
      '<button type="button" class="nfse-ext-btn-secondary" id="' +
      PREFIX +
      '-ano-buscar">Buscar ano</button>' +
      '<button type="button" class="nfse-ext-btn-primary" id="' +
      PREFIX +
      '-ano-csv" disabled>Exportar CSV</button>' +
      '<button type="button" class="nfse-ext-btn-primary" id="' +
      PREFIX +
      '-ano-pdf" disabled>Exportar PDF</button>' +
      "</div></div>";

    modal.addEventListener("click", function (e) {
      if (e.target.getAttribute("data-close") === "1") fecharModalAno();
    });

    document.body.appendChild(modal);
    document.addEventListener("keydown", onEscapeAno);

    var statusEl = document.getElementById(PREFIX + "-ano-status");
    var btnBuscar = document.getElementById(PREFIX + "-ano-buscar");
    var btnCsv = document.getElementById(PREFIX + "-ano-csv");
    var btnPdf = document.getElementById(PREFIX + "-ano-pdf");

    function atualizarBotoesExport() {
      var pronto = cacheAno.ano === ano && Array.isArray(cacheAno.notas);
      btnCsv.disabled = !pronto;
      btnPdf.disabled = !pronto;
      if (pronto) {
        statusEl.innerHTML =
          "Pronto: <strong>" +
          cacheAno.notas.length +
          "</strong> notas &nbsp;|&nbsp; Somatório: <strong>R$ " +
          formatValorBR(somarNotas(cacheAno.notas)) +
          "</strong>";
      }
    }

    if (cacheAno.ano === ano && Array.isArray(cacheAno.notas)) {
      atualizarBotoesExport();
    }

    btnBuscar.addEventListener("click", async function () {
      btnBuscar.disabled = true;
      btnCsv.disabled = true;
      btnPdf.disabled = true;
      try {
        var notas = await buscarNotasDoAno(ano, function (msg) {
          statusEl.textContent = msg;
        });
        cacheAno = { ano: ano, notas: notas };
        atualizarBotoesExport();
      } catch (err) {
        console.error(err);
        statusEl.textContent =
          "Falha na busca: " + (err && err.message ? err.message : String(err));
      } finally {
        btnBuscar.disabled = false;
      }
    });

    btnCsv.addEventListener("click", function () {
      if (!cacheAno.notas) return;
      baixarCsv(cacheAno.notas, "nfse-emitidas-" + ano + ".csv");
    });

    btnPdf.addEventListener("click", function () {
      if (!cacheAno.notas) return;
      gerarPdf(cacheAno.notas, ano);
    });
  }

  function injetarBotaoAno() {
    if (document.getElementById(BTN_ANO_ID)) return;

    var btn = document.createElement("a");
    btn.id = BTN_ANO_ID;
    btn.href = "javascript:void(0);";
    btn.className = "btn btn-lg btn-warning";
    btn.innerHTML = "<span>Exportar ano selecionado</span>";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      abrirModalAno();
    });
    appendBtnNaBarra(btn);
  }

  // --- bootstrap ---
  cleanup();

  var tabela = getTabela();
  if (!tabela) {
    console.error(
      "[nfse-resumo] Tabela de notas não encontrada. Execute na página de NFS-e Emitidas."
    );
    return;
  }

  if (getLinhasNotas(tabela).length === 0) {
    console.warn("[nfse-resumo] Nenhuma nota listada na tabela.");
  }

  injectStyles();
  injetarFiltroMesAno();
  injetarCheckboxes(tabela);
  injetarTotal(tabela);
  injetarBotaoCsv(tabela);
  injetarBotaoAno();

  console.info(
    "[nfse-resumo] Pronto. Use \"Exportar ano selecionado\" para CSV/PDF do ano."
  );
})();
