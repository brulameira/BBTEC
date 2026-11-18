/* Proteção das telas do sistema: quem não estiver logado volta para o login.
   Também preenche o nome/e-mail do menu, aplica as configurações de alerta do usuário
   e faz o botão SAIR deslogar de verdade.
   Uso (no topo de cada tela):  const usuario = await exigirLogin(); */
import { auth, db, doc, getDoc, firebaseConfigurado, onAuthStateChanged, signOut, lembrarUsuario } from "./firebase-app.js";
import { definirConfiguracao } from "./regras-alertas.js";

const LOGIN = "login.html";
const chaveConfig = (uid) => "bbtec_cfg_" + uid;

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