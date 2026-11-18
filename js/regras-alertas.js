/* Regras de alerta compartilhadas pelas telas de Estoques, Alertas e Relatórios.
   Os limites vêm da tela de Configurações de cada usuário (valores padrão abaixo). */
export const CONFIG_PADRAO = { limiteEstoqueBaixo: 5, diasVencimento: 7, alertaEstoque: true, alertaValidade: true };

let cfg = { ...CONFIG_PADRAO };

const inteiro = (v, min, max, padrao) => {
  const n = Number(v);
  return v !== "" && v != null && Number.isInteger(n) && n >= min && n <= max ? n : padrao;
};

export function normalizarConfiguracao(c = {}) {
  return {
    limiteEstoqueBaixo: inteiro(c.limiteEstoqueBaixo, 0, 1000, CONFIG_PADRAO.limiteEstoqueBaixo),
    diasVencimento: inteiro(c.diasVencimento, 0, 365, CONFIG_PADRAO.diasVencimento),
    alertaEstoque: c.alertaEstoque !== false,
    alertaValidade: c.alertaValidade !== false
  };
}
export function definirConfiguracao(c) { cfg = normalizarConfiguracao(c); }
export function obterConfiguracao() { return { ...cfg }; }

export function hojeSemHora() { const h = new Date(); h.setHours(0, 0, 0, 0); return h; }

// Aceita "AAAA-MM-DD", "DD/MM/AAAA", Timestamp do Firestore ou Date
export function paraData(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") v = v.toDate();
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === "string") {
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/); if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  }
  return null;
}

export function textoValidade(dias) {
  if (dias < 0) return `venceu há ${-dias} ${dias === -1 ? "dia" : "dias"}`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

// Lista os alertas de UM produto (pode ter 0, 1 ou 2)
export function alertasDoProduto(p, hoje = hojeSemHora()) {
  const lista = [];
  const qtd = Number(p.quantidade) || 0;
  const limite = (p.estoqueMinimo !== undefined && p.estoqueMinimo !== "" && !isNaN(Number(p.estoqueMinimo))) ? Number(p.estoqueMinimo) : cfg.limiteEstoqueBaixo;
  if (cfg.alertaEstoque && qtd <= limite) {
    lista.push({ tipo: "estoque", prioridade: qtd === 0 ? 1 : 3, ordem: qtd, grave: true,
      titulo: qtd === 0 ? "Produto sem estoque" : "Produto com estoque baixo",
      detalhe: qtd === 0 ? "sem unidades em estoque" : `restam ${qtd} ${qtd === 1 ? "unidade" : "unidades"}` });
  }
  const val = paraData(p.validade ?? p.dataValidade);
  if (cfg.alertaValidade && val) {
    const dias = Math.round((val - hoje) / 86400000);
    if (dias <= cfg.diasVencimento) {
      lista.push({ tipo: "validade", prioridade: dias < 0 ? 0 : 2, ordem: dias, grave: dias < 0,
        titulo: dias < 0 ? "Produto vencido" : "Produto próximo do vencimento",
        detalhe: textoValidade(dias) });
    }
  }
  return lista;
}

// Total de alertas de uma lista de produtos (usado no card do estoque)
export function contarAlertas(produtos) {
  const hoje = hojeSemHora();
  return produtos.reduce((n, p) => n + alertasDoProduto(p, hoje).length, 0);
}