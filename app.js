var jogoAtual = null;
var listaTopAtual = new Array();
var memoriaCofre = new Array();

function abrirTela(nome) {
  var telas = new Array('conselho', 'top10', 'mapa', 'cofre', 'monitor');
  for (var i = 0; i < telas.length; i++) {
    var t = telas.at(i);
    document.getElementById('tela-' + t).classList.add('oculto');
    document.getElementById('menu-' + t).classList.remove('ativa');
  }
  document.getElementById('tela-' + nome).classList.remove('oculto');
  document.getElementById('menu-' + nome).classList.add('ativa');

  if (nome === 'mapa') montarMapa();
  if (nome === 'cofre') montarCofre();
  if (nome === 'monitor') auditarRadar(false);
}

function carregarCofreStorage() {
  try {
    var s = localStorage.getItem('cofre_final_v1');
    if (s) memoriaCofre = JSON.parse(s);
  } catch (e) {}
  document.getElementById('qtd-cofre').innerText = memoriaCofre.length;
}

function gravarCofreStorage() {
  try {
    localStorage.setItem('cofre_final_v1', JSON.stringify(memoriaCofre));
  } catch (e) {}
  document.getElementById('qtd-cofre').innerText = memoriaCofre.length;
}

async function iniciarReuniao(extra) {
  var tipo = document.getElementById('loteria').value;
  var modo = document.getElementById('estrategia').value;
  var fixasTxt = document.getElementById('fixas').value;
  var div = document.getElementById('resultado');
  var cfg = configs.get(tipo);

  div.innerHTML = '<div class="card">Consultando Radar e reunindo o Conselho...</div>';
  var dados = await buscarDadosOficiais(tipo, false);
  var parecer = executarConselhoAgentes(tipo, modo, fixasTxt, extra, dados);

  jogoAtual = {
    id: Date.now(),
    tipo: tipo,
    nome: cfg.nome,
    dezenas: parecer.dezenas,
    trevos: parecer.trevos,
    concursoAlvo: dados.concursoAlvo,
    dataAlvo: dados.infoExtra.dataProximo
  };

  if (parecer.isFederal) {
    div.innerHTML =
      '<div class="card">' +
        '<strong>' + cfg.nome + ' • Alvo ' + dados.concursoAlvo + '</strong>' +
        '<div class="bolas"><div style="font-size:28px; font-weight:bold; color:#00e676;">' + parecer.dezenas.at(0) + '</div></div>' +
        '<button type="button" class="btn" id="btn-salva-fed">Salvar Bilhete no Cofre</button>' +
      '</div>';
    document.getElementById('btn-salva-fed').onclick = function() { salvarItemCofre(jogoAtual); };
    return;
  }

  var gradeVolante = '';
  if (tipo !== 'supersete') {
    var itens = '';
    for (var v = cfg.min; v <= cfg.max; v++) {
      var f = v.toString().padStart(2, '0');
      itens += '<div class="v-num ' + (parecer.dezenas.includes(f) ? 'on' : '') + '">' + f + '</div>';
    }
    gradeVolante = '<details style="margin-top:10px;"><summary style="color:#00e676; font-size:13px;">Ver Espelho do Volante Oficial</summary><div class="volante">' + itens + '</div></details>';
  }

  var bolasHtml = parecer.dezenas.map(function(d) { return '<div class="bola">' + d + '</div>'; }).join('');
  var trevosHtml = parecer.trevos.map(function(t) { return '<div class="bola trevo">🍀' + t + '</div>'; }).join('');

  div.innerHTML =
    '<div class="card">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
        '<span style="font-size:13px; color:#00e676; font-weight:bold;">ATA • ' + cfg.nome + ' (' + dados.concursoAlvo + ')</span>' +
        '<span class="score-tag">Score ' + parecer.score + '/100</span>' +
      '</div>' +
      '<div class="msg" style="border-color:#2979ff;"><strong>1. Estatístico:</strong> ' + parecer.parecerEstatistico + '</div>' +
      '<div class="msg" style="border-color:#ff9100;"><strong>2. Matemático:</strong> ' + parecer.parecerMatematico + '</div>' +
      '<div class="msg" style="border-color:#d500f9;"><strong>3. Psicólogo:</strong> ' + parecer.parecerPsicologo + '</div>' +
      '<div class="msg"><strong>4. Estrategista Chefe:</strong> ' + parecer.parecerChefe + '</div>' +
      '<div class="bolas">' + bolasHtml + trevosHtml + '</div>' +
      gradeVolante +
      '<div class="grid2"><button type="button" class="btn-sec" id="btn-zebras">Pedir Mais Zebras</button><button type="button" class="btn-sec" id="btn-excl">+ Exclusividade</button></div>' +
      '<div class="grid2"><button type="button" class="btn-sec" style="background:#2979ff;" id="btn-copiar">Copiar Jogo</button><button type="button" class="btn-sec" style="background:#00e676; color:#000;" id="btn-salvar">Salvar no Cofre</button></div>' +
      '<div style="font-size:11px; color:#888; text-align:center; margin-top:10px;">' + dados.fonte + '</div>' +
    '</div>';

  document.getElementById('btn-zebras').onclick = function() { iniciarReuniao('zebras'); };
  document.getElementById('btn-excl').onclick = function() { iniciarReuniao('exclusivo'); };
  document.getElementById('btn-copiar').onclick = function() { copiarTextoJogo(jogoAtual); };
  document.getElementById('btn-salvar').onclick = function() { salvarItemCofre(jogoAtual); };
}

async function rodarTorneio() {
  var tipo = document.getElementById('loteria').value;
  var modo = document.getElementById('estrategia').value;
  var fixasTxt = document.getElementById('fixas').value;
  var qtdTop = parseInt(document.getElementById('qtd-top').value) || 10;
  var div = document.getElementById('lista-top10');
  var cfg = configs.get(tipo);

  div.innerHTML = '<div class="msg" style="margin-top:12px;">Processando 100 combinações para ' + cfg.nome + '...</div>';
  var dados = await buscarDadosOficiais(tipo, false);
  var melhores = gerarTorneioTop10(tipo, modo, fixasTxt, qtdTop, dados);
  listaTopAtual = melhores;

  var html =
    '<div style="margin-top:14px; text-align:center;">' +
      '<strong class="verde">Melhores para ' + cfg.nome + ' • Alvo ' + dados.concursoAlvo + '</strong>' +
      '<button type="button" class="btn-sec" style="width:100%; margin-top:8px; background:#2979ff;" id="btn-copiar-todos">Copiar Todas as ' + melhores.length + ' Sequências (Bolão)</button>' +
    '</div>';

  melhores.forEach(function(item, index) {
    var pos = index + 1;
    var bolasHtml = item.dezenas.map(function(d) { return '<div class="bola">' + d + '</div>'; }).join('');
    var trevosHtml = item.trevos.map(function(t) { return '<div class="bola trevo">🍀' + t + '</div>'; }).join('');

    html +=
      '<div class="rank-item">' +
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<strong>#' + pos + ' Lugar</strong>' +
          '<span class="score-tag">Score ' + item.score + '/100</span>' +
        '</div>' +
        '<div class="bolas">' + bolasHtml + trevosHtml + '</div>' +
        '<div class="grid2">' +
          '<button type="button" class="btn-sec btn-top-copiar" data-idx="' + index + '">Copiar</button>' +
          '<button type="button" class="btn-sec btn-top-salvar" style="background:#00e676; color:#000;" data-idx="' + index + '">Salvar no Cofre</button>' +
        '</div>' +
      '</div>';
  });

  div.innerHTML = html;

  document.getElementById('btn-copiar-todos').onclick = function() {
    var linhas = listaTopAtual.map(function(it, idx) {
      var linha = 'Jogo ' + String(idx + 1).padStart(2, '0') + ': ' + it.dezenas.join(' - ');
      if (it.trevos.length > 0) linha += ' | Trevos: ' + it.trevos.join(' - ');
      return linha;
    });
    var textoFinal = cfg.nome + ' (Alvo ' + dados.concursoAlvo + ')\n' + linhas.join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(textoFinal).then(function() { alert('Todas as sequências copiadas!'); });
    else prompt('Copie:', textoFinal);
  };

  var btnsCopiar = div.querySelectorAll('.btn-top-copiar');
  btnsCopiar.forEach(function(b) {
    b.onclick = function() {
      var idx = parseInt(b.getAttribute('data-idx'));
      var sel = listaTopAtual.at(idx);
      copiarTextoJogo({ dezenas: sel.dezenas, trevos: sel.trevos });
    };
  });

  var btnsSalvar = div.querySelectorAll('.btn-top-salvar');
  btnsSalvar.forEach(function(b) {
    b.onclick = function() {
      var idx = parseInt(b.getAttribute('data-idx'));
      var sel = listaTopAtual.at(idx);
      salvarItemCofre({
        id: Date.now() + idx,
        tipo: tipo,
        nome: cfg.nome,
        dezenas: sel.dezenas,
        trevos: sel.trevos,
        concursoAlvo: dados.concursoAlvo,
        dataAlvo: dados.infoExtra.dataProximo
      });
    };
  });
}

async function montarMapa() {
  var tipo = document.getElementById('loteria').value;
  var cfg = configs.get(tipo);
  var grade = document.getElementById('grade-calor');
  if (tipo === 'federal' || tipo === 'supersete') { grade.innerHTML = 'Indisponível para esta modalidade.'; return; }
  grade.innerHTML = 'Carregando...';
  var dados = await buscarDadosOficiais(tipo, false);
  var freq = new Map();
  for (var i = cfg.min; i <= cfg.max; i++) freq.set(i, 0);
  dados.lista50.forEach(function(j) { if (Array.isArray(j)) j.forEach(function(n) { var num = parseInt(n); if (freq.has(num)) freq.set(num, freq.get(num) + 1); }); });
  var vals = Array.from(freq.values());
  var med = vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
  var fixas = document.getElementById('fixas').value.split(',').map(function(n) { return parseInt(n.trim()); }).filter(function(n) { return !isNaN(n); });

  grade.innerHTML = '';
  for (var i = cfg.min; i <= cfg.max; i++) {
    (function(numAtual) {
      var cls = fixas.includes(numAtual) ? 'sel' : (freq.get(numAtual) > med * 1.15 ? 'quente' : (freq.get(numAtual) < med * 0.85 ? 'frio' : ''));
      var el = document.createElement('div');
      el.className = 'cel ' + cls;
      el.innerHTML = '<span>' + numAtual.toString().padStart(2,'0') + '</span><span style="font-size:10px;">' + freq.get(numAtual) + 'x</span>';
      el.onclick = function() {
        var lista = document.getElementById('fixas').value.split(',').map(function(n) { return parseInt(n.trim()); }).filter(function(n) { return !isNaN(n); });
        if (lista.includes(numAtual)) lista = lista.filter(function(x) { return x !== numAtual; });
        else if (lista.length < cfg.qtd - 1) lista.push(numAtual);
        document.getElementById('fixas').value = lista.sort(function(a,b){return a-b;}).map(function(x){return x.toString().padStart(2,'0');}).join(', ');
        montarMapa();
      };
      grade.appendChild(el);
    })(i);
  }
}

function copiarTextoJogo(obj) {
  if (!obj) return;
  var txt = obj.dezenas.join(' - ');
  if (obj.trevos && obj.trevos.length > 0) txt += ' | Trevos: ' + obj.trevos.join(' - ');
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function() { alert('Copiado: ' + txt); });
  else prompt('Copie:', txt);
}

function salvarItemCofre(obj) {
  if (!obj) return;
  memoriaCofre.unshift(obj);
  gravarCofreStorage();
  alert('Salvo no Cofre para o Concurso Alvo ' + obj.concursoAlvo + '!');
}

async function montarCofre() {
  var div = document.getElementById('lista-cofre');
  carregarCofreStorage();
  if (memoriaCofre.length === 0) { div.innerHTML = '<div class="card" style="text-align:center; color:#888;">Cofre vazio.</div>'; return; }
  div.innerHTML = '<div class="card">Conferindo resultados oficiais...</div>';
  div.innerHTML = '';

  for (var k = 0; k < memoriaCofre.length; k++) {
    (async function(item) {
      var oficial = await buscarDadosOficiais(item.tipo, false);
      var sorteadas = Array.isArray(oficial.ultimas) ? oficial.ultimas.map(function(n) { return n.toString().padStart(2, '0'); }) : new Array();
      var acertos = 0;
      var bolas = item.dezenas.map(function(d) {
        var ok = sorteadas.includes(d);
        if (ok) acertos++;
        return '<div class="bola ' + (ok ? 'acerto' : 'neutra') + '">' + d + '</div>';
      }).join('');

      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<strong>' + item.nome + ' • Alvo ' + (item.concursoAlvo || 'Oficial') + '</strong>' +
          '<button type="button" class="btn-sec btn-excluir" style="height:30px; padding:0 10px; background:#d50000; border:none;">Excluir</button>' +
        '</div>' +
        '<div class="sub">Conferido com último resultado (' + oficial.concursoUltimo + ')</div>' +
        '<div class="bolas">' + bolas + '</div>' +
        '<div style="text-align:center; color:#00e676; font-weight:bold;">' + acertos + ' Acerto(s)</div>';

      card.querySelector('.btn-excluir').onclick = function() {
        memoriaCofre = memoriaCofre.filter(function(x) { return x.id !== item.id; });
        gravarCofreStorage();
        montarCofre();
      };
      div.appendChild(card);
    })(memoriaCofre.at(k));
  }
}

document.getElementById('btn-gerar').onclick = function() { iniciarReuniao('normal'); };
document.getElementById('btn-rodar-top').onclick = rodarTorneio;
document.getElementById('btn-voltar').onclick = function() { abrirTela('conselho'); };
document.getElementById('btn-sincronizar').onclick = function() { auditarRadar(true); };
document.getElementById('btn-backup-cofre').onclick = function() {
  if (memoriaCofre.length === 0) { alert('Cofre vazio!'); return; }
  var txt = memoriaCofre.map(function(it) { return it.nome + ' (Alvo ' + it.concursoAlvo + '): ' + it.dezenas.join(' - '); }).join('\n');
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function() { alert('Backup de todos os jogos copiado!'); });
  else prompt('Copie seu backup:', txt);
};

document.getElementById('menu-conselho').onclick = function() { abrirTela('conselho'); };
document.getElementById('menu-top10').onclick = function() { abrirTela('top10'); };
document.getElementById('menu-mapa').onclick = function() { abrirTela('mapa'); };
document.getElementById('menu-cofre').onclick = function() { abrirTela('cofre'); };
document.getElementById('menu-monitor').onclick = function() { abrirTela('monitor'); };
document.getElementById('loteria').onchange = function() { auditarRadar(false); };

carregarCofreStorage();
auditarRadar(false);
setInterval(function() { auditarRadar(true); }, 5 * 60 * 1000);
