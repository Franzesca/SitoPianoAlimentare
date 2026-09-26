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
const { ING, BASI, PASTI, TARGET, SETTIMANA_TIPO } = caricaModulo('dati.js',
  ['ING','BASI','PASTI','TARGET','TIPI','CATEGORIE','SETTIMANA_TIPO','valoriBase100','valoriPasto']);
const { calcola, formatta } = caricaModulo('motore.js', ['calcola','formatta','costruisciIndici']);

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
    if (Math.abs(k - targetGiorno) > 100) { console.log('  ', d.g, k, 'kcal, scarto', k - targetGiorno, 'dal target', targetGiorno); bad++; }
  });
  bad ? fail('settimana tipo: ' + bad + ' problema/i') : ok('settimana tipo: ogni giorno con pranzo in piano è entro ±100 kcal dal target');
})();

console.log('\n' + (errori ? errori + ' problema/i trovati.' : 'Tutti i controlli passati.'));
process.exit(errori ? 1 : 0);
