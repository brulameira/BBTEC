/* Proteção das telas do sistema: quem não estiver logado volta para o login.
   Também preenche o nome/e-mail do menu e faz o botão SAIR deslogar de verdade.
   Uso (no topo de cada tela):  const usuario = await exigirLogin(); */
import { auth, firebaseConfigurado, onAuthStateChanged, signOut, lembrarUsuario } from "./firebase-app.js";

const LOGIN = "login.html";

export function exigirLogin() {
  return new Promise((resolve) => {
    if (!firebaseConfigurado) { location.replace(LOGIN); return; }
    let liberado = false;
    onAuthStateChanged(auth, (usuario) => {
      if (!usuario) { location.replace(LOGIN); return; } // sem login (ou saiu em outra aba)
      if (liberado) return;
      liberado = true;
      lembrarUsuario(usuario);
      const nome = document.getElementById("usuarioNome");
      const email = document.getElementById("usuarioEmail");
      if (nome) nome.textContent = sessionStorage.getItem("bbtecUsuario");
      if (email) email.textContent = usuario.email || "";
      ativarSair();
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