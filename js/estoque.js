import { firebaseConfig } from "./firebase-config.js";

const POR_PAGINA = 5; // + o cartão "Criar um Estoque" na última página
const modoDemo = Object.values(firebaseConfig).some(v => v === "COLE_AQUI");

/* ---------- Camada de dados: Firestore (coleção "estoques") ou demonstração ---------- */
let dados;

if (modoDemo) {
  let lista = [{ id: "1", nome: "Produtos de Limpeza", status: "ativo", alertas: 2, imagem: "" }];
  let ouvinte = () => {};
  const emitir = () => ouvinte([...lista]);
  dados = {
    assinar: (cb) => { ouvinte = cb; emitir(); },
    criar: async (e) => { lista.push({ ...e, id: String(Date.now()), alertas: 0 }); emitir(); },
    atualizar: async (id, e) => { lista = lista.map(x => x.id === id ? { ...x, ...e } : x); emitir(); },
    excluir: async (id) => { lista = lista.filter(x => x.id !== id); emitir(); }
  };
} else {
  const V = "10.12.2";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const db = fs.getFirestore(initializeApp(firebaseConfig));
  const col = fs.collection(db, "estoques");
  dados = {
    assinar: (cb) => fs.onSnapshot(col,
      snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => aviso("Não foi possível carregar os estoques. Verifique sua conexão.", "erro")),
    criar: (e) => fs.addDoc(col, { ...e, alertas: 0, criadoEm: fs.serverTimestamp() }),
    atualizar: (id, e) => fs.updateDoc(fs.doc(db, "estoques", id), e),
    excluir: (id) => fs.deleteDoc(fs.doc(db, "estoques", id))
  };
}

/* ---------- Estado e elementos ---------- */
let estoques = [], filtro = "todos", termo = "", pagina = 1, editandoId = null;
const $ = (s) => document.querySelector(s);
const grade = $("#grade"), contador = $("#contador"), paginacao = $("#paginacao");
const dlg = $("#dialogo"), form = $("#formEstoque");
const fNome = $("#fNome"), fImagem = $("#fImagem"), fStatus = $("#fStatus");
const erroNome = $("#erroNome"), btnExcluir = $("#btnExcluir"), txtExcluir = btnExcluir.querySelector("span");
const msgExcluir = $("#msgExcluir");

$("#usuarioNome").textContent = sessionStorage.getItem("bbtecUsuario") || "Usuario_111";
$("#usuarioEmail").textContent = sessionStorage.getItem("bbtecEmail") || "Usuario@gmail.com";

function aviso(msg, tipo = "sucesso") {
  const el = $("#aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 3500);
}

/* ---------- Renderização ---------- */
function filtrados() {
  return estoques.filter(e =>
    (filtro === "todos" || (filtro === "ativos" ? e.status === "ativo" : e.status === "desativado")) &&
    e.nome.toLowerCase().includes(termo.toLowerCase()));
}

function render() {
  const lista = filtrados();
  const total = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  pagina = Math.min(pagina, total);
  const visiveis = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  contador.textContent = lista.length === 1 ? "1 resultado encontrado" : `${lista.length} resultados encontrados`;
  grade.replaceChildren();

  if (!lista.length && (termo || filtro !== "todos")) {
    const p = document.createElement("p");
    p.className = "vazio"; p.textContent = "Nenhum estoque encontrado. Tente outra busca ou filtro.";
    grade.append(p);
  }

  visiveis.forEach(e => {
    const c = document.createElement("article");
    c.className = "cartao";
    const n = Number(e.alertas) || 0;
    c.innerHTML = `
      <span class="situacao ${e.status}">${e.status === "ativo" ? "Ativo" : "Desativado"}</span>
      <div class="imagem"></div>
      <h2></h2>
      <p class="alertas ${n ? "tem" : ""}">${n === 0 ? "Nenhum alerta" : n === 1 ? "1 alerta encontrado" : n + " alertas encontrados"}</p>
      <a class="btn-principal" href="produtos.html?estoque=${encodeURIComponent(e.id)}">Visualizar</a>
      <button class="link-editar" type="button">Editar</button>`;
    c.querySelector("h2").textContent = e.nome;
    const img = c.querySelector(".imagem");
    if (e.imagem) {
      const i = new Image(); i.alt = ""; i.src = e.imagem;
      i.onerror = () => { i.remove(); img.textContent = "📦"; };
      img.append(i);
    } else img.textContent = "📦";
    c.querySelector(".link-editar").addEventListener("click", () => abrir(e));
    grade.append(c);
  });

  if (pagina === total) { // cartão "Criar um Estoque" na última página
    const b = document.createElement("button");
    b.type = "button"; b.className = "cartao novo";
    b.innerHTML = `<span class="mais" aria-hidden="true">+</span>Criar um Estoque`;
    b.addEventListener("click", () => abrir());
    grade.append(b);
  }

  paginacao.replaceChildren();
  const mk = (txt, alvo, desab, atual, rotulo) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = txt; b.disabled = desab; b.setAttribute("aria-label", rotulo || "Página " + txt);
    if (atual) b.setAttribute("aria-current", "page");
    b.addEventListener("click", () => { pagina = alvo; render(); });
    paginacao.append(b);
  };
  if (total > 1) {
    mk("‹", pagina - 1, pagina === 1, false, "Página anterior");
    for (let i = 1; i <= total; i++) mk(String(i), i, false, i === pagina);
    mk("›", pagina + 1, pagina === total, false, "Próxima página");
  }

  $("#pontoAlertas").hidden = !estoques.some(e => e.alertas > 0);
}

/* ---------- Eventos ---------- */
document.querySelectorAll(".aba").forEach(a => a.addEventListener("click", () => {
  document.querySelectorAll(".aba").forEach(x => { x.classList.remove("ativa"); x.setAttribute("aria-selected", "false"); });
  a.classList.add("ativa"); a.setAttribute("aria-selected", "true");
  filtro = a.dataset.filtro; pagina = 1; render();
}));
$("#busca").addEventListener("input", e => { termo = e.target.value.trim(); pagina = 1; render(); });
$("#formBusca").addEventListener("submit", e => e.preventDefault());

function abrir(estoque) {
  editandoId = estoque ? estoque.id : null;
  $("#dialogoTitulo").textContent = estoque ? "Editar estoque" : "Criar um Estoque";
  fNome.value = estoque?.nome || ""; fImagem.value = estoque?.imagem || ""; fStatus.value = estoque?.status || "ativo";
  btnExcluir.hidden = !estoque; resetExcluir(); limparErro();
  dlg.showModal(); fNome.focus();
}
function limparErro() { 
  erroNome.hidden = true; 
  fNome.classList.remove("invalido"); 
}
function resetExcluir() {
  btnExcluir.classList.remove("confirmar");
  txtExcluir.textContent = "Excluir";
  msgExcluir.hidden = true;
}

$("#btnCancelar").addEventListener("click", () => dlg.close());

btnExcluir.addEventListener("click", async () => {
 if (!btnExcluir.classList.contains("confirmar")) { // confirmação (guia 7.5)
  btnExcluir.classList.add("confirmar");
  txtExcluir.textContent = "Confirmar exclusão";
  msgExcluir.hidden = false;
  return;
}
  try { await dados.excluir(editandoId); dlg.close(); aviso("Estoque excluído com sucesso!"); }
  catch { aviso("Não foi possível excluir o estoque. Tente novamente.", "erro"); }
});

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const nome = fNome.value.trim();
  if (!nome) {
    erroNome.textContent = "Informe o nome do estoque.";
    erroNome.hidden = false; fNome.classList.add("invalido"); fNome.focus(); return;
  }
  const payload = { nome, imagem: fImagem.value.trim(), status: fStatus.value };
  const novo = !editandoId;
  try {
    if (novo) await dados.criar(payload); else await dados.atualizar(editandoId, payload);
    dlg.close(); aviso(novo ? "Estoque cadastrado com sucesso!" : "Estoque atualizado com sucesso!");
  } catch {
    aviso("Não foi possível salvar o estoque. Verifique os campos preenchidos.", "erro");
  }
});

dados.assinar(lista => { estoques = lista; render(); });
if (modoDemo) setTimeout(() => aviso("Modo demonstração: configure o Firebase em js/firebase-config.js", "erro"), 600);
