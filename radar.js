var configs = new Map();
configs.set('megasena', { min: 1, max: 60, qtd: 6, trevos: 0, somaMin: 130, somaMax: 230, nome: 'Mega-Sena' });
configs.set('lotofacil', { min: 1, max: 25, qtd: 15, trevos: 0, somaMin: 170, somaMax: 220, nome: 'Lotofácil' });
configs.set('quina', { min: 1, max: 80, qtd: 5, trevos: 0, somaMin: 150, somaMax: 250, nome: 'Quina' });
configs.set('lotomania', { min: 0, max: 99, qtd: 50, trevos: 0, somaMin: 2200, somaMax: 2750, nome: 'Lotomania' });
configs.set('maismilionaria', { min: 1, max: 50, qtd: 6, trevos: 2, somaMin: 110, somaMax: 195, nome: '+Milionária' });
configs.set('timemania', { min: 1, max: 80, qtd: 10, trevos: 0, somaMin: 320, somaMax: 480, nome: 'Timemania' });
configs.set('duplasena', { min: 1, max: 50, qtd: 6, trevos: 0, somaMin: 110, somaMax: 195, nome: 'Dupla Sena' });
configs.set('diadesorte', { min: 1, max: 31, qtd: 7, trevos: 0, somaMin: 80, somaMax: 145, nome: 'Dia de Sorte' });
configs.set('supersete', { min: 0, max: 9, qtd: 7, trevos: 0, somaMin: 20, somaMax: 42, nome: 'Super Sete' });
configs.set('federal', { min: 0, max: 9, qtd: 5, trevos: 0, somaMin: 0, somaMax: 99, nome: 'Loteria Federal' });

var cacheDados = new Map();

async function buscarDadosOficiais(tipo, forcar) {
  if (!forcar && cacheDados.has(tipo)) return cacheDados.get(tipo);

  var infoExtra = {
    numeroUltimo: 0,
    numeroAlvo: 0,
    dataUltimo: 'Oficial',
    dataProximo: 'Próximo Sorteio',
    proximoValor: 'Consulte na Caixa',
    ganhadoresLocais: new Array()
  };

  var lista50 = new Array();
  var ultimas = new Array();
  var fonteUsada = '';
  var online = false;

  // 1. Fonte Ultrarrápida: Base GitHub CDN (lê tanto Lista quanto Objeto)
  try {
    var urlCdn = 'https://jsdelivr.net' + tipo + '.json';
    var resGit = await fetch(urlCdn);
    if (resGit.ok) {
      var json = await resGit.json();
      if (Array.isArray(json) && json.length > 0) {
        var ordenado = json.slice().sort(function(a, b) { return Number(b.concurso || b.numero) - Number(a.concurso || a.numero); });
        var ultItem = ordenado.at(0);
        infoExtra.numeroUltimo = Number(ultItem.concurso || ultItem.numero) || 0;
        infoExtra.numeroAlvo = infoExtra.numeroUltimo + 1;
        if (ultItem.data || ultItem.dataApuracao) infoExtra.dataUltimo = ultItem.data || ultItem.dataApuracao;
        ultimas = ultItem.dezenas || ultItem.listaDezenas || new Array();
        lista50 = ordenado.slice(0, 50).map(function(c) { return c.dezenas || c.listaDezenas; });
        online = true;
        fonteUsada = 'Base Oficial GitHub CDN (50 sorteios)';
      } else if (json && typeof json === 'object') {
        var mapa = new Map(Object.entries(json));
        var chaves = Array.from(mapa.keys()).map(Number).sort(function(a, b) { return b - a; });
        var ultNum = chaves.at(0) || 0;
        if (ultNum > 0) {
          infoExtra.numeroUltimo = ultNum;
          infoExtra.numeroAlvo = ultNum + 1;
          ultimas = mapa.get(String(ultNum)) || new Array();
          lista50 = chaves.slice(0, 50).map(function(k) { return mapa.get(String(k)); });
          online = true;
          fonteUsada = 'Base Oficial GitHub CDN (50 sorteios)';
        }
      }
    }
  } catch (e) {}

  // 2. Complemento em Tempo Real: API Guidi Brasil (Data, Prêmio Estimado e Cidades Ganhadoras)
  try {
    var resG = await fetch('https://guidi.dev.br' + tipo + '/ultimo');
    if (resG.ok) {
      var g = await resG.json();
      var numApi = Number(g.numero) || 0;
      if (numApi >= infoExtra.numeroUltimo) {
        if (numApi > infoExtra.numeroUltimo && Array.isArray(g.listaDezenas) && lista50.length > 0) {
          lista50.unshift(g.listaDezenas);
        }
        infoExtra.numeroUltimo = numApi;
        infoExtra.numeroAlvo = numApi + 1;
        if (Array.isArray(g.listaDezenas) && g.listaDezenas.length > 0) {
          ultimas = g.listaDezenas;
        }
      }
      if (g.dataApuracao) infoExtra.dataUltimo = g.dataApuracao;
      if (g.dataProximoConcurso) infoExtra.dataProximo = g.dataProximoConcurso;
      if (g.valorEstimadoProximoConcurso) {
        infoExtra.proximoValor = 'R$ ' + Number(g.valorEstimadoProximoConcurso).toLocaleString('pt-BR');
      }
      if (Array.isArray(g.listaMunicipioUFGanhadores)) {
        infoExtra.ganhadoresLocais = g.listaMunicipioUFGanhadores.map(function(m) {
          return (m.municipio || 'Cidade') + '/' + (m.uf || 'BR') + ' (' + (m.ganhadores || 1) + 'x)';
        });
      }
      online = true;
      fonteUsada = fonteUsada ? 'GitHub CDN + API Caixa Tempo Real' : 'API Caixa Tempo Real';
    }
  } catch (e) {}

  if (lista50.length === 0 && ultimas.length > 0) {
    lista50 = new Array(ultimas);
  }
  // 3. Contingência caso totalmente sem internet
  if (!online) {
    var cfg = configs.get(tipo);
    for (var i = 0; i < 15; i++) {
      var s = new Set();
      while (s.size < cfg.qtd) s.add(Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min);
      lista50.push(Array.from(s));
    }
    ultimas = lista50.at(0);
    fonteUsada = 'Modo Offline (Sem conexão)';
  }

  var pacote = {
    concursoUltimo: infoExtra.numeroUltimo > 0 ? '#' + infoExtra.numeroUltimo : 'Offline',
    concursoAlvo: infoExtra.numeroAlvo > 0 ? '#' + infoExtra.numeroAlvo : 'Próximo',
    ultimas: ultimas,
    lista50: lista50,
    infoExtra: infoExtra,
    fonte: fonteUsada,
    online: online
  };

  if (online) cacheDados.set(tipo, pacote);
  return pacote;
}

async function auditarRadar(forcar) {
  var painel = document.getElementById('painel-radar');
  var tipo = document.getElementById('loteria').value;
  var cfg = configs.get(tipo);
  var stTopo = document.getElementById('status');
  var boxAlvo = document.getElementById('concurso-alvo');

  if (painel) painel.innerHTML = '<div class="msg">Sincronizando com servidores oficiais...</div>';

  var inicio = Date.now();
  var dados = await buscarDadosOficiais(tipo, forcar);
  var ping = Date.now() - inicio;

  if (dados.online) {
    stTopo.innerText = 'Online • Base Sincronizada (' + dados.lista50.length + ' sorteios)';
    stTopo.style.color = '#00e676';
    stTopo.style.borderColor = '#00e676';
    boxAlvo.innerText = 'Alvo Vigente: ' + cfg.nome + ' ' + dados.concursoAlvo + ' (' + dados.infoExtra.dataProximo + ')';
  } else {
    stTopo.innerText = 'Modo Offline • Verifique Rede';
    stTopo.style.color = '#ff5252';
    stTopo.style.borderColor = '#ff5252';
    boxAlvo.innerText = 'Alvo Vigente: ' + cfg.nome + ' (Aguardando rede)';
  }

  if (painel) {
    var locaisHtml = dados.infoExtra.ganhadoresLocais.length > 0
      ? dados.infoExtra.ganhadoresLocais.map(function(loc) { return '<span class="uf-tag">📍 ' + loc + '</span>'; }).join('')
      : '<span class="sub">Prêmio principal acumulou neste concurso ou dados regionais indisponíveis.</span>';

    painel.innerHTML =
      '<div class="msg" style="border-color:' + (dados.online ? '#00e676' : '#ff5252') + ';">' +
        '<strong>Status da Rede:</strong> ' + (dados.online ? 'CONECTADO (' + ping + 'ms)' : 'DESCONECTADO') + '<br>' +
        '<strong>Fonte Ativa:</strong> ' + dados.fonte +
      '</div>' +
      '<div class="msg" style="border-color:#2979ff;">' +
        '<strong>Último Resultado (' + cfg.nome + ' ' + dados.concursoUltimo + '):</strong><br>' +
        'Data: <b>' + dados.infoExtra.dataUltimo + '</b><br>' +
        'Dezenas: <b>' + (Array.isArray(dados.ultimas) ? dados.ultimas.join(' - ') : 'N/A') + '</b>' +
      '</div>' +
      '<div class="msg" style="border-color:#00e676;">' +
        '<strong>Próximo Concurso Alvo (' + dados.concursoAlvo + '):</strong><br>' +
        'Data Prevista: <b>' + dados.infoExtra.dataProximo + '</b><br>' +
        'Prêmio Estimado: <b class="verde">' + dados.infoExtra.proximoValor + '</b>' +
      '</div>' +
      '<div class="msg" style="border-color:#ff9100;">' +
        '<strong>Locais Onde o Prêmio Saiu:</strong><br><div style="margin-top:6px;">' + locaisHtml + '</div>' +
      '</div>';
  }
}
