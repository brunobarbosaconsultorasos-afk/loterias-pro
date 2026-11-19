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

  try {
    var resLocal = await fetch('dados_caixa.json?t=' + Date.now());
    if (resLocal.ok) {
      var banco = await resLocal.json();
      var g = banco[tipo];
      if (g && g.numero) {
        infoExtra.numeroUltimo = Number(g.numero) || 0;
        infoExtra.numeroAlvo = infoExtra.numeroUltimo + 1;
        infoExtra.dataUltimo = g.dataApuracao || 'Oficial';
        infoExtra.dataProximo = g.dataProximoConcurso || 'Próximo sorteio';
        ultimas = Array.isArray(g.listaDezenas) ? g.listaDezenas : new Array();
        if (g.valorEstimadoProximoConcurso) {
          infoExtra.proximoValor = 'R$ ' + Number(g.valorEstimadoProximoConcurso).toLocaleString('pt-BR');
        }
        if (Array.isArray(g.listaMunicipioUFGanhadores)) {
          infoExtra.ganhadoresLocais = g.listaMunicipioUFGanhadores.map(function(m) {
            return (m.municipio || 'Cidade') + '/' + (m.uf || 'BR') + ' (' + (m.ganhadores || 1) + 'x)';
          });
        }
        lista50 = new Array(ultimas);
        online = true;
        fonteUsada = 'Portal Oficial Caixa (Sincronizado via GitHub)';
      }
    }
  } catch (e) {}

  if (!online) {
    var cfg = configs.get(tipo);
    for (var i = 0; i < 15; i++) {
      var s = new Set();
      while (s.size < cfg.qtd) s.add(Math.floor(Math.random() * (cfg.max - cfg.min + 1)) + cfg.min);
      lista50.push(Array.from(s));
    }
    ultimas = lista50.at(0);
    fonteUsada = 'Aguardando sincronização';
  }

  var pacote = {
    concursoUltimo: infoExtra.numeroUltimo > 0 ? '#' + infoExtra.numeroUltimo : 'Pendente',
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

  if (painel) painel.innerHTML = '<div class="msg">Lendo base oficial do seu repositório...</div>';

  var inicio = Date.now();
  var dados = await buscarDadosOficiais(tipo, forcar);
  var ping = Date.now() - inicio;

  if (dados.online) {
    stTopo.innerText = 'Online • Portal Caixa Sincronizado';
    stTopo.style.color = '#00e676';
    stTopo.style.borderColor = '#00e676';
    boxAlvo.innerText = 'Alvo Vigente: ' + cfg.nome + ' ' + dados.concursoAlvo + ' (' + dados.infoExtra.dataProximo + ')';
  } else {
    stTopo.innerText = 'Aguardando Dados • Toque em Sincronizar';
    stTopo.style.color = '#ffab00';
    stTopo.style.borderColor = '#ffab00';
    boxAlvo.innerText = 'Alvo Vigente: ' + cfg.nome;
  }

  if (painel) {
    var locaisHtml = dados.infoExtra.ganhadoresLocais.length > 0
      ? dados.infoExtra.ganhadoresLocais.map(function(loc) { return '<span class="uf-tag">📍 ' + loc + '</span>'; }).join('')
      : '<span class="sub">Prêmio principal acumulou neste concurso ou dados regionais indisponíveis.</span>';

    painel.innerHTML =
      '<div class="msg" style="border-color:' + (dados.online ? '#00e676' : '#ffab00') + ';">' +
        '<strong>Status da Rede:</strong> ' + (dados.online ? 'CONECTADO (' + ping + 'ms)' : 'AGUARDANDO DADOS') + '<br>' +
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
  a
