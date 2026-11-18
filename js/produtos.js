import { db, collection, onSnapshot, writeBatch, updateDoc, doc, getDoc, serverTimestamp } from "./firebase-app.js";
import { exigirLogin } from "./sessao.js";

const params = new URLSearchParams(location.search);
const estoqueId = params.get("estoque");
const veioDosAlertas = params.get("origem") === "alertas";
const voltarParaAlertas = () => { if (veioDosAlertas) location.href = "alertas.html"; };
const $ = (s) => document.querySelector(s);

function aviso(msg, tipo = "sucesso") {
  const el = $("#aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 3500);
}

function semAcesso(texto) {
  $("#contador").textContent = "";
  $("#btnNovo").hidden = true;
  $("#vazio").hidden = false;
  $("#vazio").innerHTML = texto;
}

const usuario = await exigirLogin(); // sem login, a página volta para o login

if (!estoqueId) {
  semAcesso('Nenhum estoque selecionado. <a href="estoque.html">Volte aos estoques</a> e clique em "Visualizar".');
  throw new Error("Estoque não informado na URL");
}

/* ---------- Dados: estoques/{id}/produtos (só o dono do estoque tem acesso) ---------- */
let nomeDoEstoque = "Estoque";
try {
  const s = await getDoc(doc(db, "estoques", estoqueId));
  if (!s.exists()) throw new Error("inexistente");
  nomeDoEstoque = s.data().nome || "Estoque";
} catch {
  semAcesso('Estoque não encontrado ou sem permissão de acesso. <a href="estoque.html">Volte aos estoques</a>.');
  throw new Error("Sem acesso ao estoque");
}

const col = collection(db, "estoques", estoqueId, "produtos");
const colMov = collection(db, "estoques", estoqueId, "movimentacoes");
const responsavel = usuario.displayName || usuario.email || "Usuário";

// Monta um registro do histórico de entradas e saídas
const movimento = (prod, tipo, quantidade, saldoAnterior, saldoNovo, motivo) => ({
  produtoId: prod.id, produtoNome: prod.nome, produtoCodigo: prod.codigo,
  tipo, quantidade, saldoAnterior, saldoNovo, motivo, usuarioNome: responsavel, data: serverTimestamp()
});

const dados = {
  assinar: (cb) => onSnapshot(col,
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    () => aviso("Não foi possível carregar os produtos. Verifique sua conexão.", "erro")),

  // Produto novo: se já tem unidades, registra a entrada inicial no histórico
  criar: async (p) => {
    const ref = doc(col), lote = writeBatch(db);
    lote.set(ref, { ...p, criadoEm: serverTimestamp() });
    if (p.quantidade > 0) lote.set(doc(colMov), movimento({ id: ref.id, ...p }, "entrada", p.quantidade, 0, p.quantidade, "Cadastro do produto"));
    await lote.commit();
  },

  // Edição: se a quantidade mudou, registra o ajuste no histórico
  atualizar: async (id, p, anterior) => {
    const lote = writeBatch(db);
    lote.update(doc(col, id), p);
    const antes = Number(anterior?.quantidade) || 0, dif = p.quantidade - antes;
    if (dif !== 0) lote.set(doc(colMov), movimento({ id, ...p }, dif > 0 ? "entrada" : "saida", Math.abs(dif), antes, p.quantidade, "Ajuste na edição do produto"));
    await lote.commit();
  },

  // Entrada ou saída manual (botões dos detalhes)
  movimentar: async (prod, tipo, quantidade, motivo) => {
    const antes = Number(prod.quantidade) || 0;
    const depois = tipo === "entrada" ? antes + quantidade : antes - quantidade;
    const lote = writeBatch(db);
    lote.update(doc(col, prod.id), { quantidade: depois });
    lote.set(doc(colMov), movimento(prod, tipo, quantidade, antes, depois, motivo));
    await lote.commit();
  },

  // Exclusão: as unidades restantes saem do histórico como "Produto excluído"
  excluir: async (prod) => {
    const lote = writeBatch(db);
    lote.delete(doc(col, prod.id));
    const antes = Number(prod.quantidade) || 0;
    if (antes > 0) lote.set(doc(colMov), movimento(prod, "saida", antes, antes, 0, "Produto excluído do estoque"));
    await lote.commit();
  }
};

/* ---------- Estado e elementos ---------- */
let produtos = [], termo = "", atual = null; // atual = produto aberto nos detalhes / em edição
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const corpo = $("#corpo"), contador = $("#contador"), vazio = $("#vazio");
const dlgDetalhe = $("#dlgDetalhe"), dlgForm = $("#dlgForm"), form = $("#formProduto");
const btnExcluir = $("#btnExcluir"), txtExcluir = btnExcluir.querySelector("span"), msgExcluir = $("#msgExcluir");
const campos = { nome: $("#fNome"), codigo: $("#fCodigo"), preco: $("#fPreco"), validade: $("#fValidade"), quantidade: $("#fQtd"), fornecedor: $("#fFornecedor"), endereco: $("#fEndereco") };

$("#tituloEstoque").textContent = nomeDoEstoque;
document.title = nomeDoEstoque + " | BBtec";

const dataBR = (v) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0, 10).split("-").reverse().join("/") : "/";

/* ---------- Planilha ---------- */
function render() {
  const t = termo.toLowerCase();
  const lista = produtos
    .filter(p => p.nome.toLowerCase().includes(t) || String(p.codigo).toLowerCase().includes(t))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  contador.textContent = produtos.length === 1 ? "1 produto cadastrado" : `${produtos.length} produtos cadastrados`;
  corpo.replaceChildren();

  lista.forEach(p => {
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td");
    const b = document.createElement("button");
    b.type = "button"; b.className = "nome-produto"; b.textContent = p.nome;
    tdNome.append(b);
    const tdCod = document.createElement("td"); tdCod.textContent = p.codigo;
    const tdPreco = document.createElement("td"); tdPreco.className = "num"; tdPreco.textContent = brl.format(p.preco);
    const tdValidade = document.createElement("td"); tdValidade.textContent = dataBR(p.validade);
    const tdQtd = document.createElement("td"); tdQtd.className = "num";
    if (Number(p.quantidade) === 0) { tdQtd.innerHTML = '<span class="sem-estoque">Sem estoque</span>'; }
    else tdQtd.textContent = p.quantidade;
    tr.append(tdNome, tdCod, tdPreco, tdValidade, tdQtd);
    tr.addEventListener("click", () => detalhes(p));
    b.addEventListener("click", (e) => { e.stopPropagation(); detalhes(p); });
    corpo.append(tr);
  });

  vazio.hidden = lista.length > 0;
  if (!lista.length) vazio.textContent = termo ? "Nenhum produto encontrado. Tente outro nome ou código." : 'Nenhum produto cadastrado ainda. Clique em "Cadastrar produto".';
}

/* ---------- Detalhes ---------- */
function resetExcluir() { btnExcluir.classList.remove("confirmar"); txtExcluir.textContent = "Excluir"; msgExcluir.hidden = true; }

function detalhes(p) {
  atual = p;
  $("#detTitulo").textContent = p.nome;
  $("#dCodigo").textContent = p.codigo;
  $("#dPreco").textContent = brl.format(p.preco);
  $("#dQtd").textContent = Number(p.quantidade) === 0 ? "0 (sem estoque)" : p.quantidade;
  $("#dValidade").textContent = dataBR(p.validade);
  $("#dFornecedor").textContent = p.fornecedor || "-";
  $("#dEndereco").textContent = p.endereco || "-";
  resetExcluir();
  dlgDetalhe.showModal();
}

$("#btnFechar").addEventListener("click", () => { dlgDetalhe.close(); voltarParaAlertas(); });
$("#btnEditar").addEventListener("click", () => { dlgDetalhe.close(); abrirForm(atual); });

btnExcluir.addEventListener("click", async () => {
  if (!btnExcluir.classList.contains("confirmar")) { // confirmação (guia 7.5)
    btnExcluir.classList.add("confirmar"); txtExcluir.textContent = "Confirmar exclusão"; msgExcluir.hidden = false;
    return;
  }
  try { await dados.excluir(atual); dlgDetalhe.close(); aviso("Produto excluído com sucesso!"); setTimeout(voltarParaAlertas, 1200); }
  catch { aviso("Não foi possível excluir o produto. Tente novamente.", "erro"); }
});

/* ---------- Cadastro / edição ---------- */
const erroDe = (input) => input.parentElement.querySelector(".erro");
function limparErros() {
  Object.values(campos).forEach(i => { erroDe(i).hidden = true; i.classList.remove("invalido"); });
}

function abrirForm(p) {
  atual = p || null;
  $("#formTitulo").textContent = p ? "Editar produto" : "Cadastrar produto";
  campos.nome.value = p?.nome ?? "";
  campos.codigo.value = p?.codigo ?? "";
  campos.preco.value = p?.preco ?? "";
  campos.validade.value = p?.validade ?? "";
  campos.quantidade.value = p?.quantidade ?? "";
  campos.fornecedor.value = p?.fornecedor ?? "";
  campos.endereco.value = p?.endereco ?? "";
  limparErros();
  dlgForm.showModal(); campos.nome.focus();
}
$("#btnNovo").addEventListener("click", () => abrirForm());
$("#btnCancelar").addEventListener("click", () => dlgForm.close());

function validar() {
  const v = (i) => i.value.trim();
  const codigoRepetido = produtos.some(p => p.id !== atual?.id && String(p.codigo).toLowerCase() === v(campos.codigo).toLowerCase());
  const qtd = Number(campos.quantidade.value);
  const regras = [
    [campos.nome, !v(campos.nome) && "Informe o nome do produto."],
    [campos.codigo, !v(campos.codigo) ? "Informe o código do produto." : codigoRepetido && "Já existe um produto com este código."],
    [campos.preco, (campos.preco.value === "" || Number(campos.preco.value) < 0) && "Informe um preço válido."],
    [campos.validade, !v(campos.validade) && "Informe a data de validade."],
    [campos.quantidade, (campos.quantidade.value === "" || !Number.isInteger(qtd) || qtd < 0) && "Informe um número inteiro, a partir de 0."],
    [campos.fornecedor, !v(campos.fornecedor) && "Informe o nome do fornecedor."],
    [campos.endereco, !v(campos.endereco) && "Informe o endereço do fornecedor."]
  ];
  limparErros();
  let primeiro = null;
  regras.forEach(([input, msg]) => {
    if (!msg) return;
    const p = erroDe(input); p.textContent = msg; p.hidden = false; input.classList.add("invalido");
    primeiro ||= input;
  });
  primeiro?.focus();
  return !primeiro;
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!validar()) return;
  const payload = {
    nome: campos.nome.value.trim(),
    codigo: campos.codigo.value.trim(),
    preco: Number(campos.preco.value),
    validade: campos.validade.value,
    quantidade: Number(campos.quantidade.value),
    fornecedor: campos.fornecedor.value.trim(),
    endereco: campos.endereco.value.trim()
  };
  const novo = !atual;
  try {
    if (novo) await dados.criar(payload); else await dados.atualizar(atual.id, payload, atual);
    dlgForm.close(); aviso(novo ? "Produto cadastrado com sucesso!" : "Produto atualizado com sucesso!"); setTimeout(voltarParaAlertas, 1200);
  } catch {
    aviso("Não foi possível salvar o produto. Verifique os campos preenchidos.", "erro");
  }
});

/* ---------- Entradas e saídas (histórico de movimentações) ---------- */
const linhaMov = document.createElement("div");
linhaMov.className = "mov-botoes";
linhaMov.innerHTML = '<button type="button" class="btn-sec" id="btnEntrada">+ Registrar entrada</button><button type="button" class="btn-sec" id="btnSaida">− Registrar saída</button>';
dlgDetalhe.querySelector(".acoes").before(linhaMov);

const dlgMov = document.createElement("dialog");
dlgMov.setAttribute("aria-labelledby", "movTitulo");
dlgMov.innerHTML = `<form id="formMov" novalidate>
  <h2 id="movTitulo"></h2>
  <p class="mov-saldo" id="movSaldo"></p>
  <div class="campo">
    <label for="movQtd">Quantidade</label>
    <input type="number" id="movQtd" min="1" step="1" inputmode="numeric" placeholder="Ex.: 10">
    <p class="erro" hidden></p>
  </div>
  <div class="campo">
    <label for="movMotivo">Motivo (opcional)</label>
    <input type="text" id="movMotivo" maxlength="80" placeholder="Ex.: compra, venda, perda">
  </div>
  <div class="acoes">
    <button type="button" class="btn-sec" id="movCancelar">Cancelar</button>
    <button type="submit" class="btn-principal">Registrar</button>
  </div>
</form>`;
document.body.append(dlgMov);

const movQtd = dlgMov.querySelector("#movQtd"), movMotivo = dlgMov.querySelector("#movMotivo");
let movTipo = "entrada", movProduto = null;

function abrirMov(tipo) {
  movTipo = tipo; movProduto = atual;
  const saldo = Number(movProduto.quantidade) || 0;
  dlgMov.querySelector("#movTitulo").textContent = (tipo === "entrada" ? "Registrar entrada" : "Registrar saída") + " - " + movProduto.nome;
  dlgMov.querySelector("#movSaldo").textContent = `Quantidade atual em estoque: ${saldo}`;
  movQtd.value = ""; movMotivo.value = "";
  const erro = erroDe(movQtd); erro.hidden = true; movQtd.classList.remove("invalido");
  dlgDetalhe.close(); dlgMov.showModal(); movQtd.focus();
}

$("#btnEntrada").addEventListener("click", () => abrirMov("entrada"));
$("#btnSaida").addEventListener("click", () => abrirMov("saida"));
dlgMov.querySelector("#movCancelar").addEventListener("click", () => { dlgMov.close(); detalhes(movProduto); });

dlgMov.querySelector("#formMov").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const qtd = Number(movQtd.value), saldo = Number(movProduto.quantidade) || 0, erro = erroDe(movQtd);
  let msg = "";
  if (movQtd.value === "" || !Number.isInteger(qtd) || qtd < 1) msg = "Informe uma quantidade inteira, a partir de 1.";
  else if (movTipo === "saida" && qtd > saldo) msg = `A saída é maior que o saldo: há ${saldo} ${saldo === 1 ? "unidade" : "unidades"} em estoque.`;
  erro.textContent = msg; erro.hidden = !msg; movQtd.classList.toggle("invalido", !!msg);
  if (msg) { movQtd.focus(); return; }

  const motivo = movMotivo.value.trim() || (movTipo === "entrada" ? "Entrada manual" : "Saída manual");
  try {
    await dados.movimentar(movProduto, movTipo, qtd, motivo);
    dlgMov.close();
    aviso(movTipo === "entrada" ? "Entrada registrada com sucesso!" : "Saída registrada com sucesso!");
    if (veioDosAlertas) setTimeout(voltarParaAlertas, 1200);
    else { const p = produtos.find(x => x.id === movProduto.id); if (p) detalhes(p); }
  } catch {
    aviso("Não foi possível registrar a movimentação. Tente novamente.", "erro");
  }
});

$("#busca").addEventListener("input", e => { termo = e.target.value.trim(); render(); });
$("#formBusca").addEventListener("submit", e => e.preventDefault());

let abrirDaUrl = params.get("produto"); // vindo da tela de alertas: abre o produto direto
dados.assinar(lista => {
  produtos = lista; render();
  if (abrirDaUrl) { const p = produtos.find(x => x.id === abrirDaUrl); abrirDaUrl = null; if (p) detalhes(p); }
});