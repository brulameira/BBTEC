import { db, doc, setDoc } from "./firebase-app.js";
import { exigirLogin, guardarConfigLocal } from "./sessao.js";
import { CONFIG_PADRAO, obterConfiguracao, definirConfiguracao, normalizarConfiguracao } from "./regras-alertas.js";

const $ = (id) => document.getElementById(id);

function aviso(msg, tipo = "sucesso") {
  const el = $("aviso");
  el.textContent = msg; el.className = "aviso " + tipo; el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 3500);
}

const usuario = await exigirLogin(); // já aplica as configurações salvas

const campos = { alertaEstoque: $("alertaEstoque"), limite: $("limite"), alertaValidade: $("alertaValidade"), dias: $("dias") };

function preencher(c) {
  campos.alertaEstoque.checked = c.alertaEstoque;
  campos.limite.value = c.limiteEstoqueBaixo;
  campos.alertaValidade.checked = c.alertaValidade;
  campos.dias.value = c.diasVencimento;
  atualizarEstado();
}

// Campo numérico fica desligado quando o aviso correspondente está desativado
function atualizarEstado() {
  campos.limite.disabled = !campos.alertaEstoque.checked;
  campos.dias.disabled = !campos.alertaValidade.checked;
}
campos.alertaEstoque.addEventListener("change", atualizarEstado);
campos.alertaValidade.addEventListener("change", atualizarEstado);

preencher(obterConfiguracao());

function erro(id, campo, msg) {
  const p = $(id);
  p.textContent = msg || ""; p.hidden = !msg;
  campo.classList.toggle("invalido", !!msg);
  return !msg;
}
const inteiroEm = (v, min, max) => v !== "" && Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max;

$("btnPadrao").addEventListener("click", () => {
  preencher(CONFIG_PADRAO);
  erro("erroLimite", campos.limite, ""); erro("erroDias", campos.dias, "");
  aviso("Valores padrão restaurados. Clique em Salvar para aplicar.");
});

$("formConfig").addEventListener("submit", async (e) => {
  e.preventDefault();
  const okLimite = erro("erroLimite", campos.limite, campos.alertaEstoque.checked && !inteiroEm(campos.limite.value, 0, 1000) ? "Informe um número inteiro de 0 a 1000." : "");
  const okDias = erro("erroDias", campos.dias, campos.alertaValidade.checked && !inteiroEm(campos.dias.value, 0, 365) ? "Informe um número inteiro de 0 a 365." : "");
  if (!okLimite) { campos.limite.focus(); return; }
  if (!okDias) { campos.dias.focus(); return; }

  const atual = obterConfiguracao();
  const nova = normalizarConfiguracao({
    alertaEstoque: campos.alertaEstoque.checked,
    limiteEstoqueBaixo: campos.alertaEstoque.checked ? campos.limite.value : atual.limiteEstoqueBaixo,
    alertaValidade: campos.alertaValidade.checked,
    diasVencimento: campos.alertaValidade.checked ? campos.dias.value : atual.diasVencimento
  });

  try {
    await setDoc(doc(db, "usuarios", usuario.uid), { config: nova }, { merge: true });
    guardarConfigLocal(usuario.uid, nova);
    definirConfiguracao(nova);
    aviso("Configurações salvas com sucesso!");
  } catch {
    aviso("Não foi possível salvar as configurações. Tente novamente.", "erro");
  }
});