// Tela de cadastro: validação no navegador (demonstração, sem servidor)
(function(){
  var form = document.getElementById('form-cadastro');
  if (!form) return;
  var sucesso = document.getElementById('sucesso');
  var forca = document.getElementById('forca');

  var regras = {
    nome: function(v){ return v.trim().length >= 3 ? '' : 'Informe seu nome completo.'; },
    email: function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Digite um e-mail válido, como nome@empresa.com.'; },
    senha: function(v){ return v.length >= 8 ? '' : 'A senha precisa ter pelo menos 8 caracteres.'; },
    confirmar: function(v){ return v && v === form.elements.senha.value ? '' : 'As senhas não coincidem.'; },
    termos: function(){ return form.elements.termos.checked ? '' : 'Aceite os termos de uso para continuar.'; }
  };

  function mostrar(nome, msg){
    var campo = form.elements[nome];
    var erro = document.getElementById('erro-' + nome);
    var caixa = campo.closest('.entrada');
    erro.textContent = msg ? '⚠ ' + msg : '';
    erro.hidden = !msg;
    campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (caixa) caixa.classList.toggle('invalido', !!msg);
    return !msg;
  }
  function validar(nome){ return mostrar(nome, regras[nome](form.elements[nome].value)); }

  Object.keys(regras).forEach(function(nome){
    var el = form.elements[nome];
    if (nome === 'termos') { el.addEventListener('change', function(){ validar(nome); }); return; }
    el.addEventListener('blur', function(){ if (el.value) validar(nome); });
    el.addEventListener('input', function(){
      if (el.getAttribute('aria-invalid') === 'true') validar(nome);
      if (nome === 'senha') {
        atualizarForca(el.value);
        if (form.elements.confirmar.value) validar('confirmar');
      }
    });
  });

  function atualizarForca(v){
    var n = 0;
    if (v.length >= 8) n++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) n++;
    if (v.length >= 12 || /[^A-Za-z0-9]/.test(v)) n++;
    if (!v) { forca.classList.remove('on'); return; }
    n = Math.max(n, 1);
    forca.classList.add('on');
    forca.setAttribute('data-n', n);
    forca.querySelector('small').textContent = 'Força da senha: ' + ['', 'fraca', 'média', 'forte'][n];
  }

  document.querySelectorAll('.olho').forEach(function(btn){
    btn.addEventListener('click', function(){
      var campo = document.getElementById(btn.getAttribute('data-alvo'));
      var ver = campo.type === 'password';
      campo.type = ver ? 'text' : 'password';
      btn.setAttribute('aria-label', ver ? 'Ocultar senha' : 'Mostrar senha');
      btn.setAttribute('aria-pressed', ver ? 'true' : 'false');
    });
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    sucesso.hidden = true;
    var primeiro = null;
    Object.keys(regras).forEach(function(nome){
      if (!validar(nome) && !primeiro) primeiro = form.elements[nome];
    });
    if (primeiro) { primeiro.focus(); return; }
    form.reset();
    atualizarForca('');
    sucesso.hidden = false;
    sucesso.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
