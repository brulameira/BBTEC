/* BBtec - Cadastro: validação, força da senha e criação da conta no Firebase Authentication.
   O perfil (sem senha) é salvo no Firestore, em usuarios/{uid}. */
import { auth, firebaseConfigurado, createUserWithEmailAndPassword, updateProfile, garantirPerfil, lembrarUsuario } from "./firebase-app.js";

const DESTINO = "estoque.html"; // para onde ir depois de cadastrar

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("form-cadastro");
  if (!form) return;

  const campos = {
    nome: $("nome"),
    email: $("email"),
    senha: $("senha"),
    confirmar: $("confirmar"),
    termos: $("termos")
  };

  /* ---------- Regras de validação (cada uma devolve "" se estiver ok) ---------- */
  const validadores = {
    nome() {
      const v = campos.nome.value.trim().replace(/\s+/g, " ");
      if (!v) return "Informe seu nome completo.";
      if (v.split(" ").length < 2) return "Digite nome e sobrenome.";
      return "";
    },
    email() {
      const v = campos.email.value.trim();
      if (!v) return "Informe seu e-mail.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Digite um e-mail válido, como nome@empresa.com.";
      return "";
    },
    senha() {
      const v = campos.senha.value;
      if (!v) return "Crie uma senha.";
      if (v.length < 8) return "A senha precisa ter no mínimo 8 caracteres.";
      return "";
    },
    confirmar() {
      const v = campos.confirmar.value;
      if (!v) return "Repita a senha para confirmar.";
      if (v !== campos.senha.value) return "As senhas não são iguais.";
      return "";
    },
    termos() {
      return campos.termos.checked ? "" : "Aceite os termos de uso para continuar.";
    }
  };

  /* ---------- Mostrar / limpar mensagem de erro ---------- */
  function mostrarErro(chave, msg) {
    const campo = campos[chave];
    const aviso = $("erro-" + chave);
    const caixa = campo.closest(".entrada");
    if (msg) {
      aviso.textContent = msg;
      aviso.hidden = false;
      campo.setAttribute("aria-invalid", "true");
      if (caixa) caixa.classList.add("invalido");
    } else {
      aviso.textContent = "";
      aviso.hidden = true;
      campo.removeAttribute("aria-invalid");
      if (caixa) caixa.classList.remove("invalido");
    }
    return !msg;
  }

  const validar = (chave) => mostrarErro(chave, validadores[chave]());

  /* ---------- Força da senha ---------- */
  const forca = $("forca");
  const forcaTexto = forca ? forca.querySelector("small") : null;
  const NIVEIS = ["", "fraca", "media", "forte"];
  const TEXTOS = ["", "Senha fraca", "Senha média", "Senha forte"];

  function nivelDaSenha(s) {
    if (!s) return 0;
    let pontos = 0;
    if (s.length >= 8) pontos++;
    if (s.length >= 12) pontos++;
    if (/[a-z]/.test(s) && /[A-Z]/.test(s)) pontos++;
    if (/\d/.test(s)) pontos++;
    if (/[^A-Za-z0-9]/.test(s)) pontos++;
    if (s.length < 8 || pontos <= 2) return 1;
    return pontos === 3 ? 2 : 3;
  }

  function atualizarForca() {
    if (!forca) return;
    const n = nivelDaSenha(campos.senha.value);
    forca.dataset.nivel = String(n);
    NIVEIS.forEach((c) => c && forca.classList.remove(c));
    if (n) forca.classList.add(NIVEIS[n]);
    if (forcaTexto) forcaTexto.textContent = TEXTOS[n];
  }

  /* ---------- Eventos dos campos ---------- */
  ["nome", "email", "senha", "confirmar"].forEach((chave) => {
    const campo = campos[chave];
    campo.addEventListener("blur", () => { if (campo.value) validar(chave); });
    campo.addEventListener("input", () => {
      if (!$("erro-" + chave).hidden) validar(chave);
    });
  });

  campos.senha.addEventListener("input", () => {
    atualizarForca();
    if (campos.confirmar.value) validar("confirmar");
  });

  campos.termos.addEventListener("change", () => validar("termos"));

  /* ---------- Botões "olho": mostrar / ocultar senha ---------- */
  document.querySelectorAll(".olho").forEach((botao) => {
    botao.addEventListener("click", () => {
      const alvo = $(botao.dataset.alvo);
      const mostrar = alvo.type === "password";
      alvo.type = mostrar ? "text" : "password";
      botao.setAttribute("aria-pressed", String(mostrar));
      botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    });
  });

  /* ---------- Criação da conta ---------- */
  async function criarConta({ nome, empresa, cargo, email, senha }) {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    try {
      await garantirPerfil(cred.user, { nome, empresa, cargo }); // grava nome, e-mail, empresa e cargo (nunca a senha)
    } catch (e) {
      console.warn("Conta criada, mas o perfil não foi salvo:", e);
    }
    lembrarUsuario(cred.user, nome);
  }

  // Traduz os códigos de erro do Firebase para mensagens claras: [campo, texto]
  function traduzirErro(erro) {
    switch (erro && erro.code) {
      case "auth/email-already-in-use": return ["email", "Este e-mail já está cadastrado. Tente entrar na sua conta."];
      case "auth/invalid-email": return ["email", "Digite um e-mail válido, como nome@empresa.com."];
      case "auth/weak-password": return ["senha", "Senha muito fraca. Use pelo menos 8 caracteres."];
      case "auth/network-request-failed": return ["email", "Sem conexão. Verifique a internet e tente novamente."];
      case "auth/operation-not-allowed": return ["email", "O cadastro por e-mail não está ativado no Firebase."];
      default: return ["email", "Não foi possível criar a conta. Tente novamente."];
    }
  }

  /* ---------- Envio ---------- */
  let redirecionando = false;

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (redirecionando) return;
    $("sucesso").hidden = true;

    const chaves = Object.keys(campos);
    const resultados = chaves.map(validar);
    const primeiroComErro = chaves.find((_, i) => !resultados[i]);
    if (primeiroComErro) {
      campos[primeiroComErro].focus();
      return;
    }

    if (!firebaseConfigurado) {
      mostrarErro("email", "Firebase não configurado. Preencha o arquivo js/firebase-config.js.");
      return;
    }

    const botao = form.querySelector(".enviar");
    botao.disabled = true;
    try {
      await criarConta({
        nome: campos.nome.value.trim().replace(/\s+/g, " "),
        empresa: $("empresa").value.trim(),
        cargo: $("cargo").value.trim(),
        email: campos.email.value.trim(),
        senha: campos.senha.value
      });
      const texto = $("sucesso").querySelector("span");
      if (texto) texto.textContent = "Cadastro realizado com sucesso! Entrando no sistema...";
      $("sucesso").hidden = false;
      redirecionando = true;
      setTimeout(() => { location.href = DESTINO; }, 1500);
    } catch (erro) {
      const [chave, msg] = traduzirErro(erro);
      mostrarErro(chave, msg);
      campos[chave].focus();
      botao.disabled = false;
    }
  });
})();