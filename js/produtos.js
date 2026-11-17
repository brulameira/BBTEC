import { firebaseConfig } from "./firebase-config.js";

const estoqueId = new URLSearchParams(location.search).get("estoque");
const modoDemo = Object.values(firebaseConfig).some(v => v === "COLE_AQUI"); // observa se esta no modo demo.
const $ = (s) => document.querySelector(s);

function aviso(msg, tipo = "sucesso") {
  const el = $("#aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 3500);
}

if (!estoqueId) {
  $("#contador").textContent = "";
  $("#btnNovo").hidden = true;
  $("#vazio").hidden = false;
  $("#vazio").innerHTML = 'Nenhum estoque selecionado. <a href="estoque.html">Volte aos estoques</a> e clique em "Visualizar".';
  throw new Error("Estoque não informado na URL");
}

/* ---------- Dados: Firestore (estoques/{id}/produtos) ou demonstração (localStorage) ---------- */
let dados;
if (modoDemo) {
  const chave = "bbtec_produtos_" + estoqueId;
  const ler = () => { try { return JSON.parse(localStorage.getItem(chave)) || []; } catch { return []; } };
  let ouvinte = () => { };
  const gravar = (l) => { try { localStorage.setItem(chave, JSON.stringify(l)); } catch { } ouvinte(l); };
  dados = {
    nomeEstoque: async () => "Estoque",
    assinar: (cb) => { ouvinte = cb; cb(ler()); },
    criar: async (p) => gravar([...ler(), { ...p, id: String(Date.now()) }]),
    atualizar: async (id, p) => gravar(ler().map(x => x.id === id ? { ...x, ...p } : x)),
    excluir: async (id) => gravar(ler().filter(x => x.id !== id))
  };
} else {
  const V = "10.12.2";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = fs.getFirestore(initializeApp(firebaseConfig));
  const col = fs.collection(db, "estoques", estoqueId, "produtos");
  dados = {
    nomeEstoque: async () => { const s = await fs.getDoc(fs.doc(db, "estoques", estoqueId)); return s.exists() ? s.data().nome : "Estoque"; },
    assinar: (cb) => fs.onSnapshot(col,
      snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => aviso("Não foi possível carregar os produtos. Verifique sua conexão.", "erro")),
    criar: (p) => fs.addDoc(col, { ...p, criadoEm: fs.serverTimestamp() }),
    atualizar: (id, p) => fs.updateDoc(fs.doc(db, "estoques", estoqueId, "produtos", id), p),
    excluir: (id) => fs.deleteDoc(fs.doc(db, "estoques", estoqueId, "produtos", id))
  };
}

/* ---------- Estado e elementos ---------- */
let produtos = [], termo = "", atual = null; // atual = produto aberto nos detalhes / em edição
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const corpo = $("#corpo"), contador = $("#contador"), vazio = $("#vazio");
const dlgDetalhe = $("#dlgDetalhe"), dlgForm = $("#dlgForm"), form = $("#formProduto");
const btnExcluir = $("#btnExcluir"), txtExcluir = btnExcluir.querySelector("span"), msgExcluir = $("#msgExcluir");
const campos = { nome: $("#fNome"), codigo: $("#fCodigo"), preco: $("#fPreco"), validade: $("#fValidade"), quantidade: $("#fQtd"), fornecedor: $("#fFornecedor"), endereco: $("#fEndereco") };

$("#usuarioNome").textContent = sessionStorage.getItem("bbtecUsuario") || "Usuario_111";
$("#usuarioEmail").textContent = sessionStorage.getItem("bbtecEmail") || "Usuario@gmail.com";
dados.nomeEstoque().then(n => { $("#tituloEstoque").textContent = n; document.title = n + " | BBtec"; }).catch(() => { });

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

    const tdValidade = document.createElement("td");
    if (p.validade) {
      const [ano, mes, dia] = p.validade.split("-");
      tdValidade.textContent = `${dia}/${mes}/${ano}`;
    } else {
      tdValidade.textContent = "/";
    }

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
  $("#dValidade").textContent = p.validade ? new Date(p.validade).toLocaleDateString("pt-BR") : "/";
  $("#dFornecedor").textContent = p.fornecedor || "-";
  $("#dEndereco").textContent = p.endereco || "-";
  resetExcluir();
  dlgDetalhe.showModal();
}

$("#btnFechar").addEventListener("click", () => dlgDetalhe.close());
$("#btnEditar").addEventListener("click", () => { dlgDetalhe.close(); abrirForm(atual); });

btnExcluir.addEventListener("click", async () => {
  if (!btnExcluir.classList.contains("confirmar")) { // confirmação (guia 7.5)
    btnExcluir.classList.add("confirmar"); txtExcluir.textContent = "Confirmar exclusão"; msgExcluir.hidden = false;
    return;
  }
  try { await dados.excluir(atual.id); dlgDetalhe.close(); aviso("Produto excluído com sucesso!"); }
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
    if (novo) await dados.criar(payload); else await dados.atualizar(atual.id, payload);
    dlgForm.close(); aviso(novo ? "Produto cadastrado com sucesso!" : "Produto atualizado com sucesso!");
  } catch {
    aviso("Não foi possível salvar o produto. Verifique os campos preenchidos.", "erro");
  }
});

$("#busca").addEventListener("input", e => { termo = e.target.value.trim(); render(); });
$("#formBusca").addEventListener("submit", e => e.preventDefault());

dados.assinar(lista => { produtos = lista; render(); });
