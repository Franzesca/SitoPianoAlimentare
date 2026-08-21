/* ==========================================================================
   Verifica indipendente delle stime kcal/proteine dei pasti.

   Confronta i valori dichiarati in dati.js (PASTI[].val) con una stima
   calcolata esplodendo ogni pasto nei suoi ingredienti grezzi — via lo
   stesso motore usato dall'app, non a mano — e sommandoli contro una
   tabella nutrizionale di riferimento (valori standard per 100 g di
   prodotto grezzo, tipo USDA/CREA).

   Non è una fonte sostitutiva di piano-pasti-definitivo.md: i valori di
   riferimento qui sotto sono stime standard, non i dati dei prodotti
   realmente comprati, e portano un margine di incertezza proprio (~5-10%
   a seconda dell'ingrediente). È un controllo di plausibilità — serve a
   individuare pasti dove lo scarto è troppo grande per essere rumore.

   Uso:  node sorgenti/audit-nutrizionale.js
   ========================================================================== */
const D = require('./dati.js');
const {calcola} = require('./motore.js');

/* ---------- 1. Tabella di riferimento: kcal e proteine per 100 g crudo ---
   'pz' → il valore è per 100 g del prodotto, la conversione a pezzo usa
   ING[nome].pz (grammi per pezzo), già definito in dati.js.             */
const NUTR = {
  'Cipolle dorate':[40,1.1], 'Carote':[41,0.9],
  'Sovracosce di pollo disossate senza pelle':[119,18.6],
  'Skyr 0%':[65,11.5], 'Brodo (o acqua)':[3,0.3],
  'Peperoni rossi':[31,1.0], 'Pomodori pelati':[20,1.0],
  'Yogurt greco 0%':[59,10], 'Passata di pomodoro':[22,1.3],
  'Spinaci freschi':[23,2.9], 'Acqua':[0,0], 'Sedano':[16,0.7],
  'Ceci secchi':[364,19], 'Zucca':[26,1.0],
  'Latte di cocco light':[100,1.0], 'Gamberi sgusciati':[85,20],
  'Riso basmati':[350,7.5], 'Fagioli neri secchi':[341,21.6],
  'Macinato di tacchino':[150,20], 'Pane integrale':[247,9],
  'Petto di tacchino':[104,24], 'Ricotta magra':[130,8.5],
  'Olio EVO':[884,0], 'Pasta secca integrale':[335,13],
  'Petto di pollo':[120,22.5], 'Salsiccia di pollo o tacchino':[170,16],
  "Manzo magro per ragù":[175,20], 'Lenticchie rosse secche':[352,24],
  'Lenticchie verdi secche':[340,24], 'Pomodoro fresco':[18,0.9],
  'Riso jasmine':[356,7], 'Aglio':[149,6.4],
  'Formaggio magro grattugiato':[280,32], 'Farina per polenta integrale':[350,8],
  'Bulgur':[342,12], 'Insalata mista':[15,1.4], 'Sale':[0,0],
  'Lime':[25,0.4], 'Pomodorini':[18,0.9], 'Vino rosso':[85,0.1],
  'Concentrato di pomodoro':[82,4.3], 'Zenzero fresco':[80,1.8],
  'Cetriolo':[15,0.7], 'Gochujang':[220,6], 'Kimchi':[15,1.1],
  'Limoni':[22,0.4], 'Cumino':[375,18], 'Feta':[264,14],
  'Salsa di soia':[55,8], 'Grana grattugiato':[392,35],
  'Aceto di riso':[20,0], 'Cacao amaro':[228,20],
  'Pasta di curry rosso thai':[120,2], 'Tahina':[595,17],
  'Paprika affumicata':[282,14], 'Prezzemolo fresco':[36,3],
  'Cipolla rossa':[40,1.1], 'Mandorle':[579,21], 'Miele':[304,0.3],
  'Harissa':[130,2], 'Pangrattato':[395,13], 'Semi di lino':[534,18],
  'Farina di ceci':[387,22], 'Semi di zucca':[559,30],
  "Burro d'arachidi 100%":[588,25], 'Noci':[654,15], 'Senape':[66,4.4],
  'Cipollotto':[32,1.8], 'Curcuma':[312,8], 'Garam masala':[380,13],
  'Coriandolo fresco':[23,2.1], 'Basilico thai':[22,3.2], 'Cannella':[247,4],
  'Coriandolo in polvere':[298,12], 'Olio di sesamo':[884,0],
  'Semi di sesamo':[573,18], 'Alloro':[313,7.6], 'Menta fresca':[44,3.3],
  'Menta secca':[285,20], 'Aglio in polvere':[331,17], 'Cumino in semi':[375,18],
  'Bicarbonato':[0,0], 'Pepe nero':[251,10], 'Origano secco':[265,9],
  'Rosmarino':[131,3.3], 'Peperoncino':[282,12],
  'Uova':[143,12.6], 'Albumi':[52,11], 'Tortilla integrale media':[250,8],
  "Panino piccolo":[270,9],
};

function stima(ing){
  let kcal = 0, prot = 0; const mancanti = [];
  Object.entries(ing).forEach(([n, q]) => {
    const nut = NUTR[n];
    if (!nut){ mancanti.push(n); return; }
    const meta = D.ING[n] || {};
    const grammi = meta.u === 'pz' ? q * (meta.pz || 1) : q;
    kcal += nut[0] * grammi / 100;
    prot += nut[1] * grammi / 100;
  });
  return {kcal, prot, mancanti};
}

/* ---------- 2. Copertura: ogni ingrediente grezzo del registro ha un dato? */
const mancantiRegistro = Object.keys(D.ING).filter(n => !(n in NUTR));
if (mancantiRegistro.length){
  console.log('Ingredienti in ING senza dato nutrizionale di riferimento:', mancantiRegistro);
}

/* ---------- 3. Audit pasto per pasto -------------------------------------
   Esplode ogni pasto da solo (2 porzioni, tutte le basi a quantità esatta)
   così il risultato non dipende da come si prepara il resto della
   settimana — è la ricetta di QUEL pasto, isolata.                       */
const modiEsatto = {}; D.BASI.forEach(b => modiEsatto[b.id] = 'esatto');
const SOGLIA_PCT = 0.15, SOGLIA_KCAL = 30;

const righe = [];
D.PASTI.forEach(p => {
  if (p.libero || !(p.ing || []).length) return; // pasto libero: nessuna ricetta da verificare
  const r = calcola({[p.id]: 2}, modiEsatto, D);
  const {kcal, prot, mancanti} = stima(r.ing);
  const stKcal = kcal / 2, stProt = prot / 2;
  const dKcal = stKcal - p.val[0], dProt = stProt - p.val[1];
  const pct = dKcal / p.val[0];
  righe.push({
    id: p.id, nome: p.nome, giorno: p.g != null ? D.GIORNI[p.g] : '—',
    dichKcal: p.val[0], stKcal, dKcal, pct,
    dichProt: p.val[1], stProt, dProt, mancanti,
    avviso: Math.abs(dKcal) >= SOGLIA_KCAL && Math.abs(pct) >= SOGLIA_PCT,
  });
});

righe.sort((a, b) => b.pct - a.pct);

console.log('\n=== AUDIT NUTRIZIONALE — pasto per pasto (26 pasti con ricetta, esclusa la cena libera) ===\n');
console.log(
  'Pasto'.padEnd(46) + 'Giorno'.padEnd(11) +
  'dich.'.padStart(8) + 'stima'.padStart(8) + 'Δkcal'.padStart(9) + 'Δ%'.padStart(8) + '   dich.P'.padStart(9) + '  stima.P'.padStart(10)
);
righe.forEach(r => {
  const segno = r.avviso ? '⚠ ' : '  ';
  console.log(
    segno + r.nome.slice(0, 43).padEnd(44) + r.giorno.padEnd(11) +
    String(r.dichKcal).padStart(8) + String(Math.round(r.stKcal)).padStart(8) +
    (r.dKcal >= 0 ? '+' : '') + String(Math.round(r.dKcal)).padStart(8) +
    ((r.pct >= 0 ? '+' : '') + (r.pct * 100).toFixed(0) + '%').padStart(8) +
    String(r.dichProt).padStart(9) + String(Math.round(r.stProt)).padStart(10)
  );
  if (r.mancanti.length) console.log('     (mancano dati per: ' + r.mancanti.join(', ') + ')');
});

const flagged = righe.filter(r => r.avviso);
console.log('\n' + flagged.length + ' pasto/i su ' + righe.length + ' con scarto ≥ ' + (SOGLIA_PCT * 100) + '% e ≥ ' + SOGLIA_KCAL + ' kcal.');

/* ---------- 4. Aggregato — settimana intera, coppia ----------------------- */
const sel = {}; D.PASTI.forEach(p => sel[p.id] = 2);
const rSett = calcola(sel, modiEsatto, D);
const {kcal: kcalSett, prot: protSett} = stima(rSett.ing);

console.log('\n=== AGGREGATO — settimana intera, coppia ===');
console.log('Dichiarato: ' + rSett.val[0] + ' kcal · ' + rSett.val[1] + ' g P');
console.log('Stimato:    ' + Math.round(kcalSett) + ' kcal · ' + Math.round(protSett) + ' g P');
const dTot = kcalSett - rSett.val[0];
console.log('Scarto:     ' + (dTot >= 0 ? '+' : '') + Math.round(dTot) + ' kcal (' + (dTot >= 0 ? '+' : '') + (100 * dTot / rSett.val[0]).toFixed(1) + '%)');
console.log('Per persona/giorno — dichiarato ' + Math.round(rSett.val[0] / 2 / 7) + ' kcal · stimato ' + Math.round(kcalSett / 2 / 7) + ' kcal (target ' + D.TARGET.kcal + ')');
