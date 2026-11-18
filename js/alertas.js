import { db, collection, query, where, getDocs } from "./firebase-app.js";
import { exigirLogin } from "./sessao.js";
import { alertasDoProduto, hojeSemHora } from "./regras-alertas.js"; // limites ficam em regras-alertas.js

const $ = (s) => document.querySelector(s);
const lista = $("#lista"), contador = $("#contador");

const usuario = await exigirLogin(); // sem login, a página volta para o login

/* ---------- Carregar os estoques do usuário e seus produtos ---------- */
async function carregar() {
  const estSnap = await getDocs(query(collection(db, "estoques"), where("donoId", "==", usuario.uid)));
  return Promise.all(estSnap.docs.map(async d => {
    const ps = await getDocs(collection(db, "estoques", d.id, "produtos"));
    return { estoque: { id: d.id, ...d.data() }, produtos: ps.docs.map(x => ({ id: x.id, ...x.data() })) };
  }));
}

/* ---------- Gerar alertas ---------- */
function gerar(grupos) {
  const hoje = hojeSemHora();
  const alertas = [];
  grupos.forEach(({ estoque, produtos }) => {
    if (estoque.status === "desativado") return; // estoques desativados não geram alerta
    produtos.forEach(p => alertasDoProduto(p, hoje).forEach(a => alertas.push({ ...a, estoque, produto: p })));
  });
  return alertas.sort((a, b) => a.prioridade - b.prioridade || a.ordem - b.ordem);
}

/* ---------- Tela ---------- */
const ICONE_GRAVE = '<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#FF2D2D"/><path d="M20 10v13M20 28v.5" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>';
const ICONE_AVISO = '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M12 2.5 1.5 21h21z" fill="#FF7A00"/><path d="M12 9v6M12 17.6v.4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';

let todos = [], filtro = "todos";

function render() {
  const vistos = todos.filter(a => filtro === "todos" || a.tipo === filtro);
  contador.textContent = todos.length === 0 ? "Você não possui alertas no sistema."
    : todos.length === 1 ? "Você possui 1 alerta no sistema." : `Você possui ${todos.length} alertas no sistema.`;
  const selo = $("#pontoAlertas");
  if (selo) {
    selo.hidden = todos.length === 0;
    selo.textContent = todos.length > 9 ? "9+" : String(todos.length);
  }
  lista.replaceChildren();

  if (!vistos.length) {
    const p = document.createElement("p"); p.className = "estado";
    p.textContent = todos.length ? "Nenhum alerta deste tipo." : "Tudo certo por aqui. Nenhum produto com estoque baixo ou perto do vencimento.";
    lista.append(p); return;
  }

  vistos.forEach(a => {
    const c = document.createElement("article"); c.className = "alerta";
    c.innerHTML = `<div class="icone">${a.grave ? ICONE_GRAVE : ICONE_AVISO}</div>
      <div class="textos"><h2></h2><p></p></div>
      <a class="btn-sec" href="produtos?estoque=${encodeURIComponent(a.estoque.id)}&produto=${encodeURIComponent(a.produto.id)}&origem=alertas">Ver Detalhes</a>`;
    c.querySelector("h2").textContent = a.titulo;
    const p = c.querySelector("p");
    const nome = document.createElement("strong"); nome.textContent = a.produto.nome;
    p.append(nome, ` - ${a.detalhe} (${a.estoque.nome || "Estoque"})`);
    lista.append(c);
  });
}

document.querySelectorAll(".aba").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".aba").forEach(x => { x.classList.remove("ativa"); x.setAttribute("aria-selected", "false"); });
  b.classList.add("ativa"); b.setAttribute("aria-selected", "true");
  filtro = b.dataset.filtro; render();
}));

try { todos = gerar(await carregar()); render(); }
catch {
  contador.textContent = "";
  lista.innerHTML = '<p class="estado">Não foi possível carregar os alertas. Verifique sua conexão e tente novamente.</p>';
}