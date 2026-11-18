import { db, auth, doc, getDoc, setDoc, updateProfile, sendPasswordResetEmail, lembrarUsuario } from "./firebase-app.js";
import { exigirLogin } from "./sessao.js";

const $ = (id) => document.getElementById(id);

function aviso(msg, tipo = "sucesso") {
  const el = $("aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 3500);
}

const usuario = await exigirLogin(); // sem login, a página volta para o login
const ref = doc(db, "usuarios", usuario.uid);

/* ---------- Carregar dados ---------- */
let perfil = {};
try {
  const s = await getDoc(ref);
  perfil = s.exists() ? s.data() : {};
} catch {
  aviso("Não foi possível carregar seu perfil. Verifique sua conexão.", "erro");
}

function iniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

$("nome").value = perfil.nome || usuario.displayName || "";
$("email").value = usuario.email || "";
$("empresa").value = perfil.empresa || "";
$("cargo").value = perfil.cargo || "";
$("iniciais").textContent = iniciais($("nome").value);

/* ---------- Conta e segurança ---------- */
const provedores = usuario.providerData.map(p => p.providerId);
const usaSenha = provedores.includes("password");
const usaGoogle = provedores.includes("google.com");
$("metodo").textContent = [usaSenha && "E-mail e senha", usaGoogle && "Google"].filter(Boolean).join(" e ") || "-";
$("desde").textContent = usuario.metadata?.creationTime ? new Date(usuario.metadata.creationTime).toLocaleDateString("pt-BR") : "-";
$("blocoSenha").hidden = !usaSenha;
$("avisoGoogle").hidden = usaSenha;

$("btnSenha").addEventListener("click", async () => {
  const botao = $("btnSenha");
  botao.disabled = true;
  try {
    await sendPasswordResetEmail(auth, usuario.email);
    aviso("Enviamos o link para o seu e-mail. Confira também o spam.");
  } catch {
    aviso("Não foi possível enviar o link agora. Tente novamente.", "erro");
  } finally { botao.disabled = false; }
});

/* ---------- Salvar alterações ---------- */
$("nome").addEventListener("input", () => { $("iniciais").textContent = iniciais($("nome").value); });

$("formPerfil").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = $("nome").value.trim().replace(/\s+/g, " ");
  const erro = $("erroNome");
  if (nome.length < 2) {
    erro.textContent = "Informe seu nome."; erro.hidden = false;
    $("nome").classList.add("invalido"); $("nome").focus(); return;
  }
  erro.hidden = true; $("nome").classList.remove("invalido");

  const botao = $("btnSalvar");
  botao.disabled = true;
  try {
    await setDoc(ref, { nome, empresa: $("empresa").value.trim(), cargo: $("cargo").value.trim(), email: usuario.email || "" }, { merge: true });
    await updateProfile(usuario, { displayName: nome });
    lembrarUsuario(usuario, nome);
    $("usuarioNome").textContent = nome;
    aviso("Perfil atualizado com sucesso!");
  } catch {
    aviso("Não foi possível salvar o perfil. Tente novamente.", "erro");
  } finally { botao.disabled = false; }
});
