/* BBtec - Login com e-mail/senha e com o Google (Firebase Authentication). */
import {
  auth, firebaseConfigurado, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,
  sendPasswordResetEmail, garantirPerfil, lembrarUsuario
} from "./firebase-app.js";

const DESTINO = "estoque.html"; // para onde ir depois de entrar

const $ = (id) => document.getElementById(id);
const form = $("form");
const email = $("email");
const senha = $("senha");

/* ---------- Mensagens ---------- */
function mostrarErro(id, msg) {
  const p = $(id);
  if (!p) { if (msg) console.warn(msg); return; }
  p.textContent = msg || "";
  p.hidden = !msg;
}
function limparErros() {
  ["erro-email", "erro-senha", "erro-geral"].forEach((id) => mostrarErro(id, ""));
  [email, senha].forEach((c) => { c.removeAttribute("aria-invalid"); c.classList.remove("invalido"); });
  const g = $("erro-geral"); if (g) g.className = "erro";
}
function mostrarGeral(texto, tipo = "erro") {
  const p = $("erro-geral");
  if (!p) return;
  p.textContent = texto; p.className = tipo === "info" ? "info" : "erro"; p.hidden = false;
}
function marcarInvalido(campo) { campo.setAttribute("aria-invalid", "true"); campo.classList.add("invalido"); }

function mensagemAuth(erro) {
  switch (erro && erro.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password": return "E-mail ou senha incorretos.";
    case "auth/invalid-email": return "Digite um e-mail válido.";
    case "auth/user-disabled": return "Esta conta foi desativada.";
    case "auth/too-many-requests": return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    case "auth/network-request-failed": return "Sem conexão. Verifique a internet e tente novamente.";
    case "auth/operation-not-allowed": return "Este tipo de login não está ativado no Firebase.";
    case "auth/unauthorized-domain": return "Este endereço não está autorizado no Firebase. Abra o site por localhost ou adicione o domínio em Authentication > Configurações.";
    case "auth/popup-blocked": return "O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.";
    default: return "Não foi possível entrar. Tente novamente.";
  }
}

const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function entrar(usuario) { lembrarUsuario(usuario); location.href = DESTINO; }
function configurado() {
  if (firebaseConfigurado) return true;
  mostrarGeral("Firebase não configurado. Preencha o arquivo js/firebase-config.js.");
  return false;
}

/* ---------- Login com e-mail e senha ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  limparErros();

  const v = email.value.trim();
  let ok = true;
  if (!v) { mostrarErro("erro-email", "Informe seu e-mail."); marcarInvalido(email); ok = false; }
  else if (!emailValido(v)) { mostrarErro("erro-email", "Digite um e-mail válido."); marcarInvalido(email); ok = false; }
  if (!senha.value) { mostrarErro("erro-senha", "Informe sua senha."); marcarInvalido(senha); ok = false; }
  if (!ok) { (email.hasAttribute("aria-invalid") ? email : senha).focus(); return; }
  if (!configurado()) return;

  const botao = form.querySelector(".btn-entrar");
  botao.disabled = true;
  try {
    const cred = await signInWithEmailAndPassword(auth, v, senha.value);
    try { await garantirPerfil(cred.user); } catch (err) { console.warn("Perfil não verificado:", err); }
    entrar(cred.user);
  } catch (erro) {
    mostrarGeral(mensagemAuth(erro));
    botao.disabled = false;
  }
});

/* ---------- Login com o Google (cria a conta no primeiro acesso) ---------- */
const botaoGoogle = $("btn-google");
if (botaoGoogle) {
  botaoGoogle.addEventListener("click", async () => {
    limparErros();
    if (!configurado()) return;
    botaoGoogle.disabled = true;
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      try { await garantirPerfil(cred.user); } catch (err) { console.warn("Perfil não salvo:", err); }
      entrar(cred.user);
    } catch (erro) {
      // Fechar a janela do Google não é erro: não mostra nada
      if (erro.code !== "auth/popup-closed-by-user" && erro.code !== "auth/cancelled-popup-request") {
        mostrarGeral(mensagemAuth(erro));
      }
      botaoGoogle.disabled = false;
    }
  });
}

/* ---------- Esqueceu a senha ---------- */
const linkSenha = document.querySelector(".link-senha");
if (linkSenha) {
  linkSenha.addEventListener("click", async (e) => {
    e.preventDefault();
    limparErros();
    const v = email.value.trim();
    if (!emailValido(v)) {
      mostrarErro("erro-email", "Digite seu e-mail acima para receber o link de redefinição.");
      marcarInvalido(email); email.focus(); return;
    }
    if (!configurado()) return;
    try {
      await sendPasswordResetEmail(auth, v);
      mostrarGeral("Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha. Confira também o spam.", "info");
    } catch (erro) {
      mostrarGeral(mensagemAuth(erro));
    }
  });
}