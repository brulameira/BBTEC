/* Proteção das telas do sistema: quem não estiver logado volta para o login.
   Também preenche o nome/e-mail do menu, aplica as configurações de alerta do usuário,
   mostra o número de alertas no sino do menu (em todas as telas) e faz o botão SAIR deslogar de verdade.
   Uso (no topo de cada tela):  const usuario = await exigirLogin(); */
import { auth, db, doc, getDoc, collection, query, where, getDocs, firebaseConfigurado, onAuthStateChanged, signOut, lembrarUsuario } from "./firebase-app.js";
import { definirConfiguracao, contarAlertas } from "./regras-alertas.js";

const LOGIN = (location.hostname === "localhost" || location.hostname === "127.0.0.1") ? "login.html" : "/login";
const chaveConfig = (uid) => "bbtec_cfg_" + uid;
const chaveSelo = (uid) => "bbtec_selo_" + uid;

export function guardarConfigLocal(uid, cfg) {
  try { localStorage.setItem(chaveConfig(uid), JSON.stringify(cfg)); } catch { /* sem cache, tudo bem */ }
}

/* Usa a cópia guardada no navegador (rápido) e atualiza em segundo plano para a próxima tela. */
async function aplicarConfiguracao(usuario) {
  const buscar = async () => {
    const s = await getDoc(doc(db, "usuarios", usuario.uid));
    const cfg = (s.exists() && s.data().config) || {};
    guardarConfigLocal(usuario.uid, cfg);
    return cfg;
  };
  let guardada = null;
  try { guardada = JSON.parse(localStorage.getItem(chaveConfig(usuario.uid))); } catch { /* ignora */ }
  if (guardada) { definirConfiguracao(guardada); buscar().catch(() => {}); }
  else { try { definirConfiguracao(await buscar()); } catch { /* usa os valores padrão */ } }
}

/* ---------- Selo de alertas no sino do menu ---------- */
function garantirSelo() {
  let selo = document.getElementById("pontoAlertas");
  if (selo) return selo;
  const link = document.querySelector('.menu nav a[href="alertas.html"]'); // telas sem o selo no HTML recebem um
  if (!link) return null;
  selo = document.createElement("span");
  selo.className = "ponto"; selo.id = "pontoAlertas"; selo.hidden = true;
  link.append(selo);
  return selo;
}

function mostrarSelo(total) {
  const selo = garantirSelo();
  if (!selo) return;
  selo.hidden = total === 0;
  selo.textContent = total > 9 ? "9+" : String(total);
  selo.title = total === 1 ? "1 alerta" : `${total} alertas`;
}

// Mostra o último valor na hora e recalcula em segundo plano (estoques ativos do usuário)
async function atualizarSelo(usuario) {
  const chave = chaveSelo(usuario.uid);
  const guardado = sessionStorage.getItem(chave);
  if (guardado !== null && !isNaN(Number(guardado))) mostrarSelo(Number(guardado));
  try {
    const estoques = await getDocs(query(collection(db, "estoques"), where("donoId", "==", usuario.uid)));
    const contagens = await Promise.all(estoques.docs
      .filter(d => d.data().status !== "desativado")
      .map(async d => {
        const ps = await getDocs(collection(db, "estoques", d.id, "produtos"));
        return contarAlertas(ps.docs.map(x => x.data()));
      }));
    const total = contagens.reduce((a, b) => a + b, 0);
    sessionStorage.setItem(chave, String(total));
    mostrarSelo(total);
  } catch { /* sem conexão: mantém o último valor */ }
}

export function exigirLogin() {
  return new Promise((resolve) => {
    if (!firebaseConfigurado) { location.replace(LOGIN); return; }
    let liberado = false;
    onAuthStateChanged(auth, async (usuario) => {
      if (!usuario) { location.replace(LOGIN); return; } // sem login (ou saiu em outra aba)
      if (liberado) return;
      liberado = true;
      lembrarUsuario(usuario);
      const nome = document.getElementById("usuarioNome");
      const email = document.getElementById("usuarioEmail");
      if (nome) nome.textContent = sessionStorage.getItem("bbtecUsuario");
      if (email) email.textContent = usuario.email || "";
      ativarSair();
      await aplicarConfiguracao(usuario);
      atualizarSelo(usuario); // não espera: a tela abre sem atraso
      resolve(usuario);
    });
  });
}

function ativarSair() {
  const sair = document.querySelector(".menu .sair");
  if (!sair) return;
  sair.addEventListener("click", async (e) => {
    e.preventDefault();
    try { await signOut(auth); } catch (erro) { console.warn("Não foi possível sair:", erro); }
    sessionStorage.removeItem("bbtecUsuario");
    sessionStorage.removeItem("bbtecEmail");
    location.href = LOGIN;
  });
}