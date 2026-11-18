import { db, collection, query, where, getDocs, orderBy, limit } from "./firebase-app.js";
import { exigirLogin } from "./sessao.js";
import { alertasDoProduto, hojeSemHora } from "./regras-alertas.js";

const $ = (id) => document.getElementById(id);
const LIMITE_MOVIMENTOS = 300; // movimentações mais recentes carregadas de cada estoque
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function aviso(msg, tipo = "sucesso") {
  const el = $("aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 3500);
}

const usuario = await exigirLogin(); // sem login, a página volta para o login

/* ---------- Carregar estoques, produtos e histórico do usuário ---------- */
let grupos = [], limitado = false, painel = "resumo";

async function carregar() {
  const estoques = await getDocs(query(collection(db, "estoques"), where("donoId", "==", usuario.uid)));
  return Promise.all(estoques.docs.map(async (d) => {
    const [ps, ms] = await Promise.all([
      getDocs(collection(db, "estoques", d.id, "produtos")),
      getDocs(query(collection(db, "estoques", d.id, "movimentacoes"), orderBy("data", "desc"), limit(LIMITE_MOVIMENTOS)))
    ]);
    if (ms.size >= LIMITE_MOVIMENTOS) limitado = true;
    return {
      estoque: { id: d.id, ...d.data() },
      produtos: ps.docs.map(x => ({ id: x.id, ...x.data() })),
      movs: ms.docs.map(x => ({ id: x.id, ...x.data() }))
    };
  }));
}

/* ---------- Formatação ---------- */
const dataBR = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0, 10).split("-").reverse().join("/") : "";
const dataHora = (ts) => ts && typeof ts.toDate === "function" ? ts.toDate() : null;
const textoDataHora = (d) => d ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "-";
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/* ---------- Dados do relatório de resumo ---------- */
function gruposSelecionados() {
  const id = $("fEstoque").value;
  return id === "todos" ? grupos : grupos.filter(g => g.estoque.id === id);
}

function linhasResumo() {
  const hoje = hojeSemHora();
  const linhas = [];
  gruposSelecionados().forEach(({ estoque, produtos }) => {
    produtos.forEach(p => {
      const alertas = estoque.status === "desativado" ? [] : alertasDoProduto(p, hoje);
      const preco = Number(p.preco) || 0, qtd = Number(p.quantidade) || 0;
      linhas.push({
        estoque: estoque.nome || "Estoque", desativado: estoque.status === "desativado",
        nome: p.nome, codigo: p.codigo, preco, quantidade: qtd, valor: preco * qtd,
        validade: dataBR(p.validade), fornecedor: p.fornecedor || "", endereco: p.endereco || "",
        temAlerta: alertas.length > 0,
        situacao: estoque.status === "desativado" ? "Estoque desativado" : alertas.length ? maiuscula(alertas.map(a => a.detalhe).join("; ")) : "Em dia"
      });
    });
  });
  return linhas.sort((a, b) => a.estoque.localeCompare(b.estoque, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
}

/* ---------- Dados do histórico ---------- */
function linhasHistorico() {
  const tipo = $("fTipo").value, busca = $("fBusca").value.trim().toLowerCase();
  const de = $("fDe").value ? new Date($("fDe").value + "T00:00:00") : null;
  const ate = $("fAte").value ? new Date($("fAte").value + "T23:59:59") : null;
  const linhas = [];
  gruposSelecionados().forEach(({ estoque, movs }) => {
    movs.forEach(m => {
      const data = dataHora(m.data);
      if (tipo !== "todos" && m.tipo !== tipo) return;
      if (de && (!data || data < de)) return;
      if (ate && (!data || data > ate)) return;
      if (busca && ![m.produtoNome, m.produtoCodigo, m.motivo].some(t => String(t || "").toLowerCase().includes(busca))) return;
      linhas.push({ data, estoque: estoque.nome || "Estoque", produto: m.produtoNome || "", codigo: m.produtoCodigo || "",
        tipo: m.tipo, quantidade: m.quantidade, antes: m.saldoAnterior, depois: m.saldoNovo, motivo: m.motivo || "", responsavel: m.usuarioNome || "" });
    });
  });
  return linhas.sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
}

/* ---------- Montagem das tabelas ---------- */
function td(texto, classe) { const c = document.createElement("td"); c.textContent = texto; if (classe) c.className = classe; return c; }

function renderResumo() {
  const linhas = linhasResumo();
  const grs = gruposSelecionados();
  const unidades = linhas.reduce((s, l) => s + l.quantidade, 0);
  const valor = linhas.reduce((s, l) => s + l.valor, 0);
  const comAlerta = linhas.filter(l => l.temAlerta).length;

  const ind = $("indicadores"); ind.replaceChildren();
  [["Estoques", grs.length], ["Produtos", linhas.length], ["Unidades em estoque", unidades], ["Valor em estoque", brl.format(valor)], ["Produtos com alerta", comAlerta]]
    .forEach(([rotulo, v]) => {
      const d = document.createElement("div"); d.className = "indicador";
      const r = document.createElement("span"); r.textContent = rotulo;
      const n = document.createElement("strong"); n.textContent = v;
      d.append(r, n); ind.append(d);
    });

  const corpo = $("corpoResumo"); corpo.replaceChildren();
  linhas.forEach(l => {
    const tr = document.createElement("tr");
    const tdSit = td(l.situacao, l.temAlerta ? "situacao-alerta" : "situacao-ok");
    tr.append(td(l.estoque), td(l.nome), td(l.codigo), td(brl.format(l.preco), "num"), td(l.quantidade, "num"), td(brl.format(l.valor), "num"), td(l.validade || "/"), tdSit);
    corpo.append(tr);
  });
  $("vazioResumo").hidden = linhas.length > 0;
  $("vazioResumo").textContent = "Nenhum produto cadastrado neste filtro.";
  $("contador").textContent = `${linhas.length} ${linhas.length === 1 ? "produto" : "produtos"} em ${grs.length} ${grs.length === 1 ? "estoque" : "estoques"}`;
}

function renderHistorico() {
  const linhas = linhasHistorico();
  const corpo = $("corpoHistorico"); corpo.replaceChildren();
  linhas.forEach(l => {
    const tr = document.createElement("tr");
    const tdProd = document.createElement("td");
    tdProd.textContent = l.produto;
    if (l.codigo) { const s = document.createElement("small"); s.textContent = l.codigo; tdProd.append(s); }
    const tdTipo = document.createElement("td");
    const tag = document.createElement("span"); tag.className = "tag " + l.tipo;
    tag.textContent = l.tipo === "entrada" ? "▲ Entrada" : "▼ Saída";
    tdTipo.append(tag);
    tr.append(td(textoDataHora(l.data)), td(l.estoque), tdProd, tdTipo, td(l.quantidade, "num"), td(`${l.antes} → ${l.depois}`, "num"), td(l.motivo), td(l.responsavel));
    corpo.append(tr);
  });
  $("vazioHistorico").hidden = linhas.length > 0;
  $("vazioHistorico").textContent = "Nenhuma movimentação encontrada. As entradas e saídas aparecem aqui quando você cadastra produtos ou usa os botões de entrada e saída nos detalhes do produto.";
  const nota = $("notaLimite");
  nota.hidden = !limitado;
  nota.textContent = `Mostrando as ${LIMITE_MOVIMENTOS} movimentações mais recentes de cada estoque.`;
  $("contador").textContent = `${linhas.length} ${linhas.length === 1 ? "movimentação" : "movimentações"}`;
}

function renderizar() { painel === "resumo" ? renderResumo() : renderHistorico(); }

/* ---------- Abas e filtros ---------- */
document.querySelectorAll(".aba").forEach(a => a.addEventListener("click", () => {
  document.querySelectorAll(".aba").forEach(x => { x.classList.remove("ativa"); x.setAttribute("aria-selected", "false"); });
  a.classList.add("ativa"); a.setAttribute("aria-selected", "true");
  painel = a.dataset.painel;
  $("painelResumo").hidden = painel !== "resumo";
  $("painelHistorico").hidden = painel !== "historico";
  $("filtrosHistorico").hidden = painel !== "historico";
  renderizar();
}));
["fEstoque", "fTipo", "fDe", "fAte"].forEach(id => $(id).addEventListener("change", renderizar));
$("fBusca").addEventListener("input", renderizar);

/* ---------- Exportar planilha (CSV para Excel) e imprimir ---------- */
// Texto que começa com = + - @ vira texto simples, para o Excel não executar como fórmula
const celula = (v) => { let t = v == null ? "" : String(v); if (/^[=+\-@]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
const dinheiro = (n) => Number(n).toFixed(2).replace(".", ",");

function baixarCsv(nome, cabecalho, linhas) {
  const texto = [cabecalho, ...linhas].map(l => l.map(celula).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + texto], { type: "text/csv;charset=utf-8" }); // \ufeff: o Excel reconhece acentos
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$("btnCsv").addEventListener("click", () => {
  const hoje = new Date().toISOString().slice(0, 10);
  if (painel === "resumo") {
    const linhas = linhasResumo();
    if (!linhas.length) { aviso("Não há produtos para exportar neste filtro.", "erro"); return; }
    baixarCsv(`bbtec-estoque-${hoje}.csv`,
      ["Estoque", "Produto", "Código", "Preço (R$)", "Quantidade", "Valor em estoque (R$)", "Validade", "Fornecedor", "Endereço do fornecedor", "Situação"],
      linhas.map(l => [l.estoque, l.nome, l.codigo, dinheiro(l.preco), l.quantidade, dinheiro(l.valor), l.validade, l.fornecedor, l.endereco, l.situacao]));
  } else {
    const linhas = linhasHistorico();
    if (!linhas.length) { aviso("Não há movimentações para exportar neste filtro.", "erro"); return; }
    baixarCsv(`bbtec-historico-${hoje}.csv`,
      ["Data e hora", "Estoque", "Produto", "Código", "Tipo", "Quantidade", "Saldo anterior", "Saldo novo", "Motivo", "Responsável"],
      linhas.map(l => [textoDataHora(l.data), l.estoque, l.produto, l.codigo, l.tipo === "entrada" ? "Entrada" : "Saída", l.quantidade, l.antes, l.depois, l.motivo, l.responsavel]));
  }
  aviso("Planilha exportada com sucesso!");
});

$("btnImprimir").addEventListener("click", () => window.print());

/* ---------- Início ---------- */
try {
  grupos = await carregar();
  const sel = $("fEstoque");
  grupos.sort((a, b) => (a.estoque.nome || "").localeCompare(b.estoque.nome || "", "pt-BR"))
    .forEach(g => { const o = document.createElement("option"); o.value = g.estoque.id; o.textContent = g.estoque.nome || "Estoque"; sel.append(o); });
  renderizar();
} catch {
  $("contador").textContent = "";
  $("vazioResumo").hidden = false;
  $("vazioResumo").textContent = "Não foi possível carregar os relatórios. Verifique sua conexão e tente novamente.";
}