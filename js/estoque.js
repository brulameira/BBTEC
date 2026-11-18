import { db, collection, query, where, onSnapshot, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "./firebase-app.js";
import { exigirLogin } from "./sessao.js";
import { contarAlertas } from "./regras-alertas.js";

const POR_PAGINA = 5; // + o cartão "Criar um Estoque" na última página
const $ = (s) => document.querySelector(s);

function aviso(msg, tipo = "sucesso") {
  const el = $("#aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  // popover: mostra o aviso na "camada de cima" do navegador, acima das janelas (dialog) abertas
  try {
    el.setAttribute("popover", "manual");
    if (el.matches(":popover-open")) el.hidePopover();
    el.showPopover();
  } catch { /* navegador antigo: fica com o estilo normal */ }
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => { el.hidden = true; try { el.hidePopover(); } catch { /* já fechado */ } }, 3500);
}

const usuario = await exigirLogin(); // sem login, a página volta para o login

/* ---------- Dados: cada estoque pertence a um usuário (donoId) ---------- */
const col = collection(db, "estoques");
const dados = {
  assinar: (cb) => onSnapshot(query(col, where("donoId", "==", usuario.uid)),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    () => aviso("Não foi possível carregar os estoques. Verifique sua conexão.", "erro")),
  criar: (e) => addDoc(col, { ...e, donoId: usuario.uid, criadoEm: serverTimestamp() }),
  atualizar: (id, e) => updateDoc(doc(db, "estoques", id), e),
  excluir: async (id) => { // apaga produtos e histórico do estoque, depois o estoque
    for (const sub of ["produtos", "movimentacoes"]) {
      const itens = await getDocs(collection(db, "estoques", id, sub));
      await Promise.all(itens.docs.map(d => deleteDoc(d.ref)));
    }
    await deleteDoc(doc(db, "estoques", id));
  },
  assinarProdutos: (id, cb) => onSnapshot(collection(db, "estoques", id, "produtos"),
    snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb([]))
};

/* ---------- Estado e elementos ---------- */
let estoques = [], filtro = "todos", termo = "", pagina = 1, editandoId = null;
let contagem = {};
const ouvintes = {};
const grade = $("#grade"), contador = $("#contador"), paginacao = $("#paginacao");
const dlg = $("#dialogo"), form = $("#formEstoque");
const fNome = $("#fNome"), fImagem = $("#fImagem"), fStatus = $("#fStatus");
const erroNome = $("#erroNome"), btnExcluir = $("#btnExcluir"), txtExcluir = btnExcluir.querySelector("span");
const msgExcluir = $("#msgExcluir");
const fArquivo = $("#fArquivo"), previa = $("#previa"); // opcionais: só existem se o envio de foto foi adicionado ao HTML
let imagemData = "", imagemAtual = "";

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
    const n = e.status === "desativado" ? 0 : (contagem[e.id] ?? 0);
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

  // selo de alertas no menu
  const totalAlertas = estoques.reduce((soma, e) => soma + (e.status === "desativado" ? 0 : (contagem[e.id] ?? 0)), 0);
  const selo = $("#pontoAlertas");
  if (selo) {
    selo.hidden = totalAlertas === 0;
    selo.textContent = totalAlertas > 9 ? "9+" : String(totalAlertas);
    selo.title = totalAlertas === 1 ? "1 alerta" : `${totalAlertas} alertas`;
  }
}

/* ---------- Filtros e busca ---------- */
document.querySelectorAll(".aba").forEach(a => a.addEventListener("click", () => {
  document.querySelectorAll(".aba").forEach(x => { x.classList.remove("ativa"); x.setAttribute("aria-selected", "false"); });
  a.classList.add("ativa"); a.setAttribute("aria-selected", "true");
  filtro = a.dataset.filtro; pagina = 1; render();
}));
$("#busca").addEventListener("input", e => { termo = e.target.value.trim(); pagina = 1; render(); });
$("#formBusca").addEventListener("submit", e => e.preventDefault());

/* ---------- Foto do estoque (envio do computador ou link) ---------- */
function mostrarPrevia(src) {
  if (!previa) return;
  if (src) { previa.src = src; previa.hidden = false; }
  else { previa.hidden = true; previa.removeAttribute("src"); }
}

// Reduz a imagem para caber no Firestore (máx. 500 px de lado, JPEG)
function comprimir(arquivo, max = 500) {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onerror = falha;
    leitor.onload = () => {
      const img = new Image();
      img.onerror = falha;
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * escala);
        c.height = Math.round(img.height * escala);
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL("image/jpeg", 0.8));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

if (fArquivo) {
  fArquivo.addEventListener("change", async () => {
    const arq = fArquivo.files[0];
    if (!arq) return;
    if (!arq.type.startsWith("image/")) {
      aviso("Escolha um arquivo de imagem (JPG, PNG ou WebP).", "erro");
      fArquivo.value = ""; return;
    }
    try { imagemData = await comprimir(arq); fImagem.value = ""; mostrarPrevia(imagemData); }
    catch { aviso("Não foi possível ler a imagem. Tente outro arquivo.", "erro"); }
  });
}
fImagem.addEventListener("input", () => {
  imagemData = ""; if (fArquivo) fArquivo.value = ""; mostrarPrevia(fImagem.value.trim());
});

/* ---------- Criar / editar / excluir ---------- */
function abrir(estoque) {
  editandoId = estoque ? estoque.id : null;
  $("#dialogoTitulo").textContent = estoque ? "Editar estoque" : "Criar um Estoque";
  imagemAtual = estoque?.imagem || ""; imagemData = ""; if (fArquivo) fArquivo.value = "";
  fNome.value = estoque?.nome || "";
  fImagem.value = imagemAtual.startsWith("data:") ? "" : imagemAtual;
  fStatus.value = estoque?.status || "ativo";
  mostrarPrevia(imagemAtual);
  btnExcluir.hidden = !estoque; resetExcluir(); limparErro();
  dlg.showModal(); fNome.focus();
}
function limparErro() { erroNome.hidden = true; fNome.classList.remove("invalido"); }
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
  const imagem = imagemData || fImagem.value.trim() || (imagemAtual.startsWith("data:") ? imagemAtual : "");
  const payload = { nome, imagem, status: fStatus.value };
  const novo = !editandoId;
  try {
    if (novo) await dados.criar(payload); else await dados.atualizar(editandoId, payload);
    dlg.close(); aviso(novo ? "Estoque cadastrado com sucesso!" : "Estoque atualizado com sucesso!");
  } catch {
    aviso("Não foi possível salvar o estoque. Verifique os campos preenchidos.", "erro");
  }
});

/* ---------- Contagem de alertas por estoque ---------- */
function sincronizarContagens() {
  const ids = new Set(estoques.map(e => e.id));
  Object.keys(ouvintes).filter(id => !ids.has(id)).forEach(id => { ouvintes[id](); delete ouvintes[id]; delete contagem[id]; });
  estoques.forEach(e => {
    if (ouvintes[e.id]) return;
    ouvintes[e.id] = dados.assinarProdutos(e.id, prods => { contagem[e.id] = contarAlertas(prods); render(); });
  });
}
dados.assinar(lista => { estoques = lista; render(); sincronizarContagens(); });