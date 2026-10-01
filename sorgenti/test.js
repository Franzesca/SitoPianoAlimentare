// Verifiche automatiche sul modello dati. node test.js
const fs = require('fs');
const path = require('path');

// dati.js e motore.js sono script semplici (pensati per essere incollati in un
// <script type="module">, senza export): li carichiamo con Function() e
// appendiamo un module.exports nello stesso scope lessicale, così le const di
// primo livello restano visibili qui senza modificare i sorgenti.
function caricaModulo(file, nomi){
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8')
    + '\n;module.exports = {' + nomi.join(',') + '};';
  const mod = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  return mod.exports;
}
const { ING, BASI, PASTI, TARGET, SETTIMANA_TIPO, valoriPastoSafe, ignotiIn } = caricaModulo('dati.js',
  ['ING','BASI','PASTI','TARGET','TIPI','CATEGORIE','SETTIMANA_TIPO','valoriBase100','valoriPasto','valoriPastoSafe','ignotiIn']);
const { calcola, formatta, testoBase } = caricaModulo('motore.js', ['calcola','formatta','costruisciIndici','testoBase']);

let errori = 0;
const fail = msg => { console.log('✗ ' + msg); errori++; };
const ok   = msg => console.log('✓ ' + msg);

/* 1. ogni ingrediente/base citato esiste */
(function testRiferimenti(){
  let bad = 0;
  const checkList = (list, ctxLabel) => (list||[]).forEach(i => {
    if (i.b && !BASI.find(b => b.id === i.b)) { console.log('  base mancante', i.b, 'in', ctxLabel); bad++; }
    if (i.n && !ING[i.n]) { console.log('  ingrediente mancante', i.n, 'in', ctxLabel); bad++; }
  });
  PASTI.forEach(p => checkList(p.ing, p.id));
  BASI.forEach(b => b.ing.forEach(([n]) => {
    if (n[0] === '@' && !BASI.find(x => x.id === n.slice(1))) { console.log('  base-in-base mancante', n, 'in', b.id); bad++; }
    else if (n[0] !== '@' && !ING[n]) { console.log('  ingrediente mancante (base)', n, 'in', b.id); bad++; }
  }));
  bad ? fail('riferimenti a ingredienti/basi (' + bad + ' problemi)') : ok('tutti gli ingredienti e le basi citati esistono nel registro');
})();

/* 2. niente id duplicati */
(function testDuplicati(){
  const idsP = PASTI.map(p => p.id), idsB = BASI.map(b => b.id);
  const dupP = idsP.filter((id,i) => idsP.indexOf(id) !== i);
  const dupB = idsB.filter((id,i) => idsB.indexOf(id) !== i);
  (dupP.length || dupB.length) ? fail('id duplicati: pasti ' + dupP + ' basi ' + dupB)
    : ok('nessun id duplicato (' + PASTI.length + ' pasti, ' + BASI.length + ' basi)');
})();

/* 3. niente cicli tra le basi (costruisciIndici lancia se ce ne sono) */
(function testCicli(){
  try { calcola({}, {}, {ING, BASI, PASTI}); ok('nessun ciclo tra le basi'); }
  catch(e){ fail('ciclo tra le basi: ' + e.message); }
})();

/* 4. ogni pasto dentro banda ±15% dal target del suo tipo (extra esclusi) */
(function testBanda(){
  let bad = 0;
  PASTI.forEach(p => {
    if (p.tipo === 'extra') return;
    const t = TARGET.pasti[p.tipo];
    if (!t) return;
    const d = (p.val[0] - t) / t;
    if (Math.abs(d) > 0.15) { console.log('  fuori banda', p.id, p.tipo, p.val[0], 'target', t, (d*100).toFixed(0)+'%'); bad++; }
  });
  bad ? fail(bad + ' pasti fuori banda ±15%') : ok('tutti i pasti dentro banda ±15% dal target del loro tipo');
})();

/* 5. settimana tipo: ogni id esiste, e i giorni con pranzo in piano stanno
   entro +-100 kcal dal target giornaliero (i giorni con pranzo fuori non sono
   valutabili sul totale, li saltiamo) */
(function testSettimanaTipo(){
  const byId = {}; PASTI.forEach(p => byId[p.id] = p);
  let bad = 0;
  const targetGiorno = TARGET.kcal;
  SETTIMANA_TIPO.giorni.forEach(d => {
    const col = byId[d.col], cen = byId[d.cena];
    if (!col) { console.log('  id colazione mancante', d.col, 'per', d.g); bad++; }
    if (!cen) { console.log('  id cena mancante', d.cena, 'per', d.g); bad++; }
    if (!d.pra || !col || !cen) return;
    const pra = byId[d.pra];
    if (!pra) { console.log('  id pranzo mancante', d.pra, 'per', d.g); bad++; return; }
    const k = col.val[0] + pra.val[0] + cen.val[0];
    const pr = col.val[1] + pra.val[1] + cen.val[1];
    if (Math.abs(k - targetGiorno) > 100) { console.log('  ', d.g, k, 'kcal, scarto', k - targetGiorno, 'dal target', targetGiorno); bad++; }
    if (pr < TARGET.p) { console.log('  ', d.g, pr, 'g di proteine, sotto il minimo di', TARGET.p); bad++; }
  });
  bad ? fail('settimana tipo: ' + bad + ' problema/i') : ok('settimana tipo: ogni giorno con pranzo in piano è entro ±100 kcal e ≥ ' + TARGET.p + ' g di proteine');
})();

/* 6. il vincolo di lui: un ingrediente crudo (lei:true) non può stare nel piatto di
   lui. Nei pasti "crudo" (pranzo da sola) è permesso; altrove deve essere soloLei.
   Dentro una base non può stare mai: le basi sono condivise. */
(function testVincolo(){
  let bad = 0;
  PASTI.forEach(p => { if (p.crudo) return;
    (p.ing||[]).forEach(i => { if (i.n && ING[i.n] && ING[i.n].lei && !i.soloLei){ console.log('  crudo nel piatto di lui:', p.id, '→', i.n); bad++; } }); });
  BASI.forEach(b => b.ing.forEach(([n]) => { if (n[0] !== '@' && ING[n] && ING[n].lei){ console.log('  ingrediente crudo dentro la base', b.id, '→', n); bad++; } }));
  bad ? fail('vincolo di lui: ' + bad + ' violazione/i') : ok('vincolo di lui rispettato (niente crudo fuori da soloLei / pasti "crudo" / basi)');
})();

/* 7. rese: una base non può pesare, cotta, più di quello che ci metti dentro.
   Eccezioni = ingredienti secchi che assorbono acqua non elencata (legumi cotti,
   ceci ammollati nei falafel): tetto di crescita dichiarato qui, motivato. */
(function testRese(){
  const TETTO = { ceci:2.6, fagioli:2.6, borlotti:2.6, lenticchie:2.6,   // secchi → cotti in acqua non elencata
                  falafel:1.6 };                                         // 150 g di ceci secchi ammollati (~×2,1) su 285 g di ingredienti
  let bad = 0;
  BASI.forEach(b => {
    let crudo = 0;
    b.ing.forEach(([n,q]) => { if (n[0] === '@') crudo += q; else { const m = ING[n]; crudo += m.u === 'pz' ? q * (m.pz||0) : q; } });
    const max = TETTO[b.id] || 1.02;
    if (b.resa > crudo * max){ console.log('  ', b.id, 'resa', b.resa, 'g su', Math.round(crudo), 'g di ingredienti: massimo', Math.round(crudo*max)); bad++; }
  });
  bad ? fail('rese impossibili (' + bad + ')') : ok('nessuna base rende più del peso dei suoi ingredienti (con i tetti di assorbimento dichiarati)');
})();

/* 8. testi delle basi: i numeri che dipendono dalla dose sono segnaposto, non
   scritti a mano (altrimenti "dividi in 5 porzioni" resta anche per una dose da 2),
   e i segnaposto si risolvono tutti */
(function testTestiBasi(){
  const fisso = /\b\d+\s+(porzion[ei]|pezz[io]|fett[ae]|pirottin[io]|pallin[ae]|muffin)\b/i;
  let bad = 0;
  BASI.forEach(b => {
    const testi = [...(b.proc||[]), b.nota || ''];
    testi.forEach(t => {
      if (fisso.test(t)){ console.log('  numero fisso in', b.id + ':', t.slice(0,90)); bad++; }
      [0.2, 1, 2.5].forEach(f => { const r = testoBase(t, b, f); if (/[{}]/.test(r)){ console.log('  segnaposto non risolto in', b.id, 'f=' + f + ':', r.slice(0,90)); bad++; } });
    });
  });
  const b = { porz:5, pezzi:12, resa:2000 };
  if (testoBase('{porz:porzione|porzioni}', b, 0.2) !== '1 porzione' || testoBase('{porz:porzione|porzioni}', b, 1) !== '5 porzioni'){ console.log('  testoBase non accorda le porzioni'); bad++; }
  if (testoBase('{ridotta:A}{multipla:B}', b, 0.5) !== 'A' || testoBase('{ridotta:A}{multipla:B}', b, 2) !== 'B' || testoBase('{ridotta:A}{multipla:B}', b, 1) !== ''){ console.log('  testoBase: ridotta/multipla'); bad++; }
  bad ? fail('testi delle basi: ' + bad + ' problema/i') : ok('testi delle basi: nessun numero fisso, tutti i segnaposto si risolvono');
})();

/* 9. nomi ingrediente usabili come chiave Firestore (finiscono in percorsi come "scorte.<nome>") */
(function testNomiIng(){
  const bad = Object.keys(ING).filter(n => /[.\/\\~*\[\]]/.test(n));
  bad.length ? fail('nomi ingrediente con caratteri vietati nei percorsi Firestore: ' + bad.join(', ')) : ok('nomi ingrediente sicuri come chiavi Firestore');
})();

/* 10. Scorte: una base accesa si salta; un ingrediente acceso NON sparisce dal calcolo
   (decide la Dispensa se mostrarlo già spuntato) */
(function testScorte(){
  const sel = { 'zup-zucca': 2, 'col-focaccina-uovo': 2 };
  const base = calcola(sel, {}, {ING, BASI, PASTI});
  const conScorte = calcola(sel, {}, {ING, BASI, PASTI}, { ingredienti:{ 'Uova':true, 'Skyr 0%':true }, basi:{ zucca:true } });
  let bad = 0;
  if (!(base.ing['Uova'] > 0) || conScorte.ing['Uova'] !== base.ing['Uova']){ console.log('  un ingrediente in Scorte è sparito o cambiato nel calcolo'); bad++; }
  if (conScorte.basi.zucca.modo !== 'salta' || conScorte.basi.zucca.produci !== 0){ console.log('  una base in Scorte non viene saltata'); bad++; }
  if (conScorte.ing['Zucca'] !== undefined){ console.log('  gli ingredienti di una base saltata finiscono in lista'); bad++; }
  if (!(base.ing['Zucca'] > 0)){ console.log('  senza scorte la zucca dovrebbe essere in lista'); bad++; }
  bad ? fail('logica Scorte: ' + bad + ' problema/i') : ok('logica Scorte: base accesa saltata, ingredienti accesi non spariscono dal calcolo');
})();

/* 11. valori tolleranti: un ingrediente non registrato non lancia e viene segnalato */
(function testValoriSafe(){
  let bad = 0;
  try {
    const r = valoriPastoSafe({ ing:[{ n:'Uova', q:2 }, { n:'Zucchine', q:200 }, { b:'baseinesistente', q:50 }] }, 'lei');
    if (r.ignoti.join() !== 'Zucchine,baseinesistente'){ console.log('  ignoti inattesi:', r.ignoti); bad++; }
    if (!(r.val[0] > 0)){ console.log('  le kcal degli ingredienti noti non sono contate'); bad++; }
    if (ignotiIn([{ n:'Zucchine', q:1 }, { n:'Uova', q:1 }, { n:'Cannella', q:0, qb:true }]).join() !== 'Zucchine'){ console.log('  ignotiIn'); bad++; }
  } catch(e){ console.log('  valoriPastoSafe ha lanciato:', e.message); bad++; }
  bad ? fail('valori tolleranti: ' + bad + ' problema/i') : ok('valori tolleranti: un ingrediente sconosciuto non rompe il calcolo');
})();

console.log('\n' + (errori ? errori + ' problema/i trovati.' : 'Tutti i controlli passati.'));
process.exit(errori ? 1 : 0);
