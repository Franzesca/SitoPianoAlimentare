const D = require('./dati.js');
const {calcola, formatta} = require('./motore.js');

// 1. controllo integrità: ogni ingrediente citato esiste nel registro
const mancanti = new Set();
D.PASTI.forEach(p => (p.ing||[]).forEach(i => { if (i.n && !D.ING[i.n]) mancanti.add(i.n); }));
D.BASI.forEach(b => b.ing.forEach(([n]) => {
  if (n[0]==='@'){ if(!D.BASI.find(x=>x.id===n.slice(1))) mancanti.add(n); }
  else if (!D.ING[n]) mancanti.add(n);
}));
console.log('Ingredienti non registrati:', mancanti.size ? [...mancanti] : 'nessuno ✓');

// 2. ogni base citata dai pasti esiste
const bMancanti = new Set();
D.PASTI.forEach(p => (p.ing||[]).forEach(i => { if (i.b && !D.BASI.find(x=>x.id===i.b)) bMancanti.add(i.b); }));
console.log('Basi non definite:', bMancanti.size ? [...bMancanti] : 'nessuna ✓');

// 3. settimana intera, 2 porzioni (lei+lui) per ogni pasto
const sel = {};
D.PASTI.forEach(p => sel[p.id] = 2);
const modi = {}; D.BASI.forEach(b => modi[b.id]='esatto');
const r = calcola(sel, modi, D);

console.log('\n=== BASI: fabbisogno settimana intera ===');
Object.entries(r.basi).forEach(([id,v]) => {
  const b = D.BASI.find(x=>x.id===id);
  console.log(`${b.nome.padEnd(38)} serve ${Math.round(v.serve)} g  (dai pasti ${Math.round(r.usoPasti[id]||0)} g)  · resa ricetta ${b.resa} g`);
});

console.log('\n=== VALORI SETTIMANA (totale coppia) ===');
console.log('Totale:', Math.round(r.val[0]), 'kcal ·', Math.round(r.val[1]), 'g P');
console.log('A testa:', Math.round(r.val[0]/2), 'kcal ·', Math.round(r.val[1]/2), 'g P  → media/gg a testa', Math.round(r.val[0]/2/7), '/', Math.round(r.val[1]/2/7));

console.log('\n=== LISTA COMPLETA (settimana intera) ===');
D.REPARTI.forEach(([k,label]) => {
  const righe = Object.entries(r.ing).filter(([n]) => (D.ING[n]||{}).r === k).sort((a,b)=>b[1]-a[1]);
  if (!righe.length) return;
  console.log('\n-- ' + label);
  righe.forEach(([n,q]) => console.log('   ' + n.padEnd(44) + formatta(n,q,D.ING)));
});

// ---- verifiche incrociate con i documenti -------------------------------
const chk = [];
const v = (n, atteso, ottenuto, tol=1) => chk.push([n, atteso, Math.round(ottenuto), Math.abs(ottenuto-atteso)<=tol ? 'ok' : 'DIVERGE']);
v('Pulled chicken consumato (doc: 640 g)', 640, r.usoPasti.pulled);
v('Lenticchie verdi consumate (doc: 360 g)', 360, r.usoPasti.lenticchie);
v('Ragù consumato (doc: 300 g)', 300, r.usoPasti.ragu);
v('Ceci dai pasti (doc: 560 g)', 560, r.usoPasti.ceci);
v('Falafel: 8 pezzi da 55-60 g (doc)', 8, r.usoPasti.falafel/57, 0.3);
v('Media kcal a testa/gg (doc: 1539)', 1539, r.val[0]/2/7, 2);
v('Media proteine a testa/gg (doc: 109)', 109, r.val[1]/2/7, 1);
v('Uova settimana (doc lista spesa: 24)', 24, r.ing['Uova'], 1);
console.log('\n=== VERIFICHE ===');
chk.forEach(([n,a,o,s]) => console.log((s==='ok'?'  ok  ':' >>>> ') + n.padEnd(46) + 'atteso ' + a + ' · ottenuto ' + o));
console.log(chk.every(c=>c[3]==='ok') ? '\nTutte le verifiche passano.' : '\nATTENZIONE: divergenze.');
