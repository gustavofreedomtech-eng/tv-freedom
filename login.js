// Login na própria TV: pede o e-mail e a senha do site uma vez e guarda SÓ neste navegador.
// Cada busca manda o login para a função do Supabase (por HTTPS), que entra no site e devolve os números.
(function () {
  var CHAVE_LOGIN = 'freedom_tv_login';
  var CHAVE_LINK = decodeURIComponent(location.hash.slice(1));   // jeito antigo: chave depois do #
  var aoEntrar = null;

  function ler() { try { var j = JSON.parse(localStorage.getItem(CHAVE_LOGIN) || 'null'); return j && j.email && j.senha ? j : null; } catch (e) { return null; } }
  function salvar(l) { try { localStorage.setItem(CHAVE_LOGIN, JSON.stringify(l)); } catch (e) {} MEMORIA = l; }
  function apagar() { try { localStorage.removeItem(CHAVE_LOGIN); } catch (e) {} MEMORIA = null; }
  var MEMORIA = ler();   // se o navegador não deixar guardar, vale até fechar a página

  var css = document.createElement('style');
  css.textContent =
    '#tvLogin{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:4vmin;' +
    'background:radial-gradient(70vmin 50vmin at 50% 20%,rgba(232,75,138,.18),transparent 70%),#0a0c12;color:#f2f4f8;font-family:"Segoe UI",system-ui,Roboto,sans-serif}' +
    '#tvLogin.on{display:flex}' +
    '#tvLogin form{width:min(92vw,max(340px,62vmin));text-align:center}' +
    '#tvLogin img{height:max(56px,12vmin)}' +
    '#tvLogin h1{font-size:max(20px,4.2vmin);margin:2vmin 0 .6vmin}' +
    '#tvLogin p{color:#8b93a7;font-size:max(13px,2.3vmin);margin:0 0 3vmin;line-height:1.4}' +
    '#tvLogin label{display:block;text-align:left;color:#8b93a7;font-size:max(12px,2vmin);margin:2vmin 0 .8vmin;letter-spacing:.05em}' +
    '#tvLogin input{width:100%;box-sizing:border-box;background:#12151f;border:2px solid #232838;border-radius:1.6vmin;color:#f2f4f8;font-size:max(16px,3vmin);padding:max(12px,2vmin);outline:none}' +
    '#tvLogin input:focus{border-color:#e84b8a}' +
    '#tvLogin button{width:100%;margin-top:3.4vmin;background:#e84b8a;color:#fff;border:0;border-radius:1.6vmin;font-size:max(16px,3vmin);font-weight:700;padding:max(13px,2.2vmin);outline:none}' +
    '#tvLogin button:focus{box-shadow:0 0 0 4px rgba(255,255,255,.5)}' +
    '#tvLogin .erro{color:#f0a53a;font-size:max(13px,2.3vmin);min-height:3vmin;margin-top:2vmin}' +
    '#tvLogin .rod{color:#5d6578;font-size:max(11px,1.8vmin);margin-top:3vmin;line-height:1.5}' +
    '#tvTrocar{position:fixed;left:14px;bottom:12px;z-index:60;background:rgba(18,21,31,.92);color:#c9ced9;border:1px solid #232838;border-radius:999px;padding:8px 14px;font:600 13px "Segoe UI",system-ui,sans-serif;display:none}' +
    '#tvTrocar.on{display:block}';
  document.head.appendChild(css);

  function montar() {
    if (document.getElementById('tvLogin')) return;
    var d = document.createElement('div');
    d.id = 'tvLogin';
    d.innerHTML = '<form autocomplete="on"><img src="logo.png" alt="Freedom"><h1>Entrar</h1>' +
      '<p>Use o e-mail e a senha do site relatorios.cbfreedom.com.br.<br>É preciso fazer só uma vez neste aparelho.</p>' +
      '<label for="tvEmail">E-MAIL</label><input id="tvEmail" type="email" autocomplete="username" autocapitalize="none" spellcheck="false">' +
      '<label for="tvSenha">SENHA</label><input id="tvSenha" type="password" autocomplete="current-password">' +
      '<button type="submit" id="tvBtn">Entrar</button><div class="erro" id="tvErro"></div>' +
      '<div class="rod">O login fica guardado só neste navegador.<br>Dica: use um login de gestor que só veja os painéis.</div></form>';
    document.body.appendChild(d);
    d.querySelector('form').onsubmit = function (ev) {
      ev.preventDefault();
      var e = document.getElementById('tvEmail').value.trim(), s = document.getElementById('tvSenha').value;
      if (!e || !s) { document.getElementById('tvErro').textContent = 'Preencha o e-mail e a senha.'; return; }
      document.getElementById('tvBtn').textContent = 'Entrando…';
      salvar({ email: e, senha: s });
      d.classList.remove('on');
      if (aoEntrar) aoEntrar();
    };
    var b = document.createElement('button');
    b.id = 'tvTrocar'; b.type = 'button'; b.textContent = 'Trocar login';
    b.onclick = function () { apagar(); TV.pedirLogin(''); };
    document.body.appendChild(b);
    // o botão "Trocar login" só aparece quando mexe o mouse / toca na tela (some depois de 4 s)
    var t; function acorda() { if (!ler() && !MEMORIA) return; b.classList.add('on'); clearTimeout(t); t = setTimeout(function () { b.classList.remove('on'); }, 4000); }
    ['mousemove', 'pointerdown'].forEach(function (ev) { document.addEventListener(ev, acorda); });
  }

  window.TV = {
    // abre a tela de login (msg = motivo, ex.: "e-mail ou senha incorretos")
    pedirLogin: function (msg) {
      montar();
      var d = document.getElementById('tvLogin');
      document.getElementById('tvErro').textContent = msg ? 'Não entrou: ' + msg : '';
      document.getElementById('tvBtn').textContent = 'Entrar';
      var l = MEMORIA; if (l) document.getElementById('tvEmail').value = l.email;
      document.getElementById('tvSenha').value = '';
      d.classList.add('on');
      setTimeout(function () { var e = document.getElementById('tvEmail'); (e.value ? document.getElementById('tvSenha') : e).focus(); }, 50);
    },
    // busca os números do painel (tipo = 'geral' ou 'fechamento')
    buscar: function (tipo, depoisDoLogin) {
      montar();
      aoEntrar = depoisDoLogin;
      if (!window.FUNCAO_URL || /COLE_AQUI/.test(window.FUNCAO_URL)) return Promise.reject(new Error('Falta colocar o endereço da função no arquivo config.js'));
      var url = window.FUNCAO_URL + (window.FUNCAO_URL.indexOf('?') >= 0 ? '&' : '?') + 'tipo=' + tipo;
      var login = MEMORIA, req;
      if (login) req = fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: login.email, senha: login.senha }), cache: 'no-store' });
      else if (CHAVE_LINK) req = fetch(url, { headers: { 'x-chave': CHAVE_LINK }, cache: 'no-store' });
      else { TV.pedirLogin(''); return Promise.reject(new Error('faça o login')); }
      return req.then(function (r) {
        return r.json().catch(function () { return { erro: 'resposta inválida da função (HTTP ' + r.status + ')' }; }).then(function (j) {
          if (j.login) {
            var senhaErrada = /incorret/.test(j.erro || '');
            if (login && senhaErrada) { var em = login.email; apagar(); MEMORIA = null; TV.pedirLogin(j.erro); document.getElementById('tvEmail').value = em; }
            else if (!login) TV.pedirLogin('');
            throw new Error(j.erro || 'faça o login');
          }
          if (!r.ok || j.erro) throw new Error(j.erro || ('HTTP ' + r.status));
          return j;
        });
      });
    },
    sair: function () { apagar(); }
  };
})();
