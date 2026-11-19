function calcularScoreCombinacao(jogo, cfg, freq) {
  var pares = jogo.filter(function(n) { return n % 2 === 0; }).length;
  var impares = jogo.length - pares;
  var diffParImpar = Math.abs(pares - impares);
  var soma = jogo.reduce(function(a, b) { return a + b; }, 0);
  var acima31 = jogo.filter(function(n) { return n > 31; }).length;

  var nota = 100;

  // Penaliza desequilíbrio extremo de pares e ímpares
  if (diffParImpar > Math.ceil(cfg.qtd * 0.35)) nota -= 14;
  else if (diffParImpar > 2) nota -= 5;

  // Verifica se a soma está dentro da curva histórica ideal da modalidade
  if (soma < cfg.somaMin || soma > cfg.somaMax) nota -= 15;

  // Penaliza sequências consecutivas longas (ex: 01, 02, 03, 04)
  var seq = 1, maxSeq = 1;
  for (var k = 1; k < jogo.length; k++) {
    if (jogo.at(k) === jogo.at(k - 1) + 1) {
      seq++;
      maxSeq = Math.max(maxSeq, seq);
    } else {
      seq = 1;
    }
  }
  if (maxSeq >= 4 && cfg.qtd <= 15) nota -= 18;

  // Bônus por exclusividade (fuga de datas de aniversário > 31)
  if (cfg.max > 31) {
    var propExcl = acima31 / cfg.qtd;
    if (propExcl >= 0.45) nota += 4;
    else if (propExcl < 0.25) nota -= 8;
  }

  return Math.max(52, Math.min(99, nota));
}

function montarUmaCombinacao(tipo, modo, fixas, extra, freq, quentes, frios, todos) {
  var cfg = configs.get(tipo);

  if (tipo === 'supersete') {
    var col = new Array();
    for (var c = 0; c < 7; c++) col.push(Math.floor(Math.random() * 10));
    return col;
  }

  var final = fixas.slice();
  var pool = new Array();

  if (modo === 'zebras' || extra === 'zebras') {
    pool = frios.slice(0, cfg.qtd + 10);
  } else if (modo === 'quentes') {
    pool = quentes.slice(0, cfg.qtd + 10);
  } else {
    var q = quentes.slice(0, Math.ceil(cfg.qtd * 0.8));
    var f = frios.slice(0, Math.ceil(cfg.qtd * 0.7));
    pool = Array.from(new Set(q.concat(f, todos)));
  }

  if (extra === 'exclusivo') {
    pool.sort(function(a, b) { return b - a; });
  }

  pool = pool.filter(function(n) { return !final.includes(n); });

  while (final.length < cfg.qtd && pool.length > 0) {
    var limite = (extra === 'exclusivo') ? Math.min(pool.length, cfg.qtd + 5) : pool.length;
    var idx = Math.floor(Math.random() * limite);
    final.push(pool.at(idx));
    pool.splice(idx, 1);
  }

  final.sort(function(a, b) { return a - b; });
  return final;
}

function executarConselhoAgentes(tipo, modo, fixasTxt, extra, dados) {
  var cfg = configs.get(tipo);

  if (tipo === 'federal') {
    var bilhete = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return {
      isFederal: true,
      dezenas: new Array(bilhete),
      trevos: new Array(),
      score: 95,
      parecerEstatistico: 'Último concurso (' + dados.concursoUltimo + ') analisado.',
      parecerMatematico: 'Bilhete gerado para o Concurso Alvo ' + dados.concursoAlvo + '.',
      parecerPsicologo: 'Terminação equilibrada fora de padrões viciados.',
      parecerChefe: 'Bilhete aprovado pelo Conselho.'
    };
  }

  var freq = new Map();
  for (var i = cfg.min; i <= cfg.max; i++) freq.set(i, 0);

  dados.lista50.forEach(function(jogo) {
    if (Array.isArray(jogo)) {
      jogo.forEach(function(n) {
        var num = parseInt(n);
        if (freq.has(num)) freq.set(num, freq.get(num) + 1);
      });
    }
  });

  var todos = Array.from(freq.keys());
  var quentes = todos.slice().sort(function(a, b) { return freq.get(b) - freq.get(a); });
  var frios = todos.slice().sort(function(a, b) { return freq.get(a) - freq.get(b); });

  var fixas = new Array();
  if (fixasTxt.trim() && tipo !== 'supersete') {
    var p = fixasTxt.split(',').map(function(n) { return parseInt(n.trim()); }).filter(function(n) { return !isNaN(n) && n >= cfg.min && n <= cfg.max; });
    fixas = Array.from(new Set(p)).slice(0, cfg.qtd - 1);
  }

  var melhorJogo = new Array();
  var melhorNota = -1;

  // Testa 25 variações e seleciona a de maior Score matemático
  for (var t = 0; t < 25; t++) {
    var cand = montarUmaCombinacao(tipo, modo, fixas, extra, freq, quentes, frios, todos);
    var nota = calcularScoreCombinacao(cand, cfg, freq);
    if (nota > melhorNota) {
      melhorNota = nota;
      melhorJogo = cand;
    }
  }

  var pares = melhorJogo.filter(function(n) { return n % 2 === 0; }).length;
  var soma = melhorJogo.reduce(function(a, b) { return a + b; }, 0);
  var acima31 = melhorJogo.filter(function(n) { return n > 31; }).length;
  var excl = cfg.max > 31 ? Math.min(99, Math.round(45 + (acima31 / cfg.qtd) * 55)) : 82;
  var formatadas = melhorJogo.map(function(n) { return n.toString().padStart(2, '0'); });

  var trevos = new Array();
  if (cfg.trevos > 0) {
    while (trevos.length < 2) {
      var tr = Math.floor(Math.random() * 6) + 1;
      if (!trevos.includes(tr)) trevos.push(tr);
    }
    trevos.sort(function(a, b) { return a - b; });
  }

  var maisQuenteFmt = quentes.at(0).toString().padStart(2, '0');
  var maisFriaFmt = frios.at(0).toString().padStart(2, '0');

  return {
    isFederal: false,
    dezenas: formatadas,
    trevos: trevos,
    score: melhorNota,
    parecerEstatistico: 'Base de <b>' + dados.lista50.length + ' sorteios</b>. Mais quente: <b>' + maisQuenteFmt + '</b> (' + freq.get(quentes.at(0)) + 'x) | Mais fria: <b>' + maisFriaFmt + '</b>.',
    parecerMatematico: 'Equilíbrio: <b>' + pares + 'P / ' + (melhorJogo.length - pares) + 'I</b> | Soma: <b>' + soma + '</b> | Score: <b>' + melhorNota + '/100</b>.',
    parecerPsicologo: 'Exclusividade Anti-Divisão: <b>' + excl + '%</b> (' + (excl >= 75 ? 'Alta' : 'Moderada') + ').',
    parecerChefe: 'Aposta otimizada para o <b>Concurso Alvo ' + dados.concursoAlvo + '</b> (Prêmio: <b>' + dados.infoExtra.proximoValor + '</b>).'
  };
}

function gerarTorneioTop10(tipo, modo, fixasTxt, qtdDesejada, dados) {
  var cfg = configs.get(tipo);
  var ranking = new Array();
  var assinaturas = new Set();

  if (tipo === 'federal') {
    for (var f = 0; f < qtdDesejada; f++) {
      var mil = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      ranking.push({ dezenas: new Array(mil), trevos: new Array(), score: 95 - f, soma: 0, pares: 0 });
    }
    return ranking;
  }

  var freq = new Map();
  for (var i = cfg.min; i <= cfg.max; i++) freq.set(i, 0);
  dados.lista50.forEach(function(jogo) {
    if (Array.isArray(jogo)) jogo.forEach(function(n) { var num = parseInt(n); if (freq.has(num)) freq.set(num, freq.get(num) + 1); });
  });

  var todos = Array.from(freq.keys());
  var quentes = todos.slice().sort(function(a, b) { return freq.get(b) - freq.get(a); });
  var frios = todos.slice().sort(function(a, b) { return freq.get(a) - freq.get(b); });

  var fixas = new Array();
  if (fixasTxt.trim() && tipo !== 'supersete') {
    var p = fixasTxt.split(',').map(function(n) { return parseInt(n.trim()); }).filter(function(n) { return !isNaN(n) && n >= cfg.min && n <= cfg.max; });
    fixas = Array.from(new Set(p)).slice(0, cfg.qtd - 1);
  }

  // Gera 100 combinações únicas e ranqueia pelas maiores notas
  for (var tentativa = 0; tentativa < 100; tentativa++) {
    var cand = montarUmaCombinacao(tipo, modo, fixas, 'normal', freq, quentes, frios, todos);
    var fmt = cand.map(function(n) { return n.toString().padStart(2, '0'); });
    var chave = fmt.join('-');

    if (!assinaturas.has(chave)) {
      assinaturas.add(chave);
      var nota = calcularScoreCombinacao(cand, cfg, freq);
      var pares = cand.filter(function(n) { return n % 2 === 0; }).length;
      var soma = cand.reduce(function(a, b) { return a + b; }, 0);

      var trevos = new Array();
      if (cfg.trevos > 0) {
        while (trevos.length < 2) {
          var tr = Math.floor(Math.random() * 6) + 1;
          if (!trevos.includes(tr)) trevos.push(tr);
        }
        trevos.sort(function(a, b) { return a - b; });
      }

      ranking.push({ dezenas: fmt, trevos: trevos, score: nota, soma: soma, pares: pares });
    }
  }

  ranking.sort(function(a, b) { return b.score - a.score; });
  return ranking.slice(0, qtdDesejada);
}
