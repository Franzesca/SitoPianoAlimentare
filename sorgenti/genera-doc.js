// Genera ../piano-pasti-definitivo.md e ../preparazione-domenicale.md da dati.js.
// Non editare quei due file a mano: si rigenerano con  node genera-doc.js
const fs = require('fs');
const path = require('path');

function caricaModulo(file, nomi){
  const src = fs.readFileSync(path.join(__dirname, file), 'utf8')
    + '\n;module.exports = {' + nomi.join(',') + '};';
  const mod = { exports: {} };
  new Function('module', 'exports', src)(mod, mod.exports);
  return mod.exports;
}
const { ING, BASI, PASTI, TARGET, CATEGORIE, SETTIMANA_TIPO } = caricaModulo('dati.js',
  ['ING','BASI','PASTI','TARGET','TIPI','CATEGORIE','SETTIMANA_TIPO','valoriBase100','valoriPasto']);
const { calcola, formatta, testoBase } = caricaModulo('motore.js', ['calcola','formatta','costruisciIndici','testoBase']);

const BASE_BY_ID = {}; BASI.forEach(b => BASE_BY_ID[b.id] = b);
const REPARTI = [
  ['carne',     'Banco carne e pesce'],
  ['latticini', 'Uova e latticini'],
  ['secchi',    'Legumi, cereali e farine'],
  ['pane',      'Pane e tortillas'],
  ['orto',      'Ortofrutta'],
  ['scatolame', 'Scatolame e conserve'],
  ['dispensa',  'Dispensa'],
  ['spezie',    'Spezie ed erbe secche'],
];

const nf = n => { const r = Math.round(n*10)/10; return String(r % 1 === 0 ? r : r.toFixed(1)); };
function fmtQIng(nome, q){
  const m = ING[nome];
  if (!m) return q + ' g';
  if (m.u === 'pz') return Math.ceil(q/(m.pz||1) - 1e-9) + ' pz';
  return formatta(nome, q, ING);
}

/* ======================================================================
   DOC 1 — piano-pasti-definitivo.md
   ====================================================================== */
function riga(ing){
  if (ing.b) return `| **${BASE_BY_ID[ing.b].nome}** (base) | ${nf(ing.q)} g${ing.soloLei?' (solo lei)':''}${ing.soloLui?' (solo lui)':''} |`;
  if (ing.qb) return `| ${ing.n} | q.b. |`;
  const m = ING[ing.n] || {};
  const qta = m.u === 'pz' ? `${ing.q} (${nf((ing.q||0)*(m.pz||0))} g)` : `${nf(ing.q)} g`;
  return `| ${ing.n} | ${qta}${ing.soloLei?' (solo lei)':''}${ing.soloLui?' (solo lui)':''} |`;
}
function sezionePasto(p){
  const vLui = p.valLui || p.val;
  const diff = Math.abs(p.val[0]-vLui[0]) >= 15;
  let out = `## ${p.nome}\n`;
  if (p.desc) out += `*${p.desc}*\n\n`;
  out += `| | Porzione |\n|---|---|\n`;
  (p.ing||[]).forEach(i => out += riga(i) + '\n');
  out += '\n';
  if (p.proc) out += `**Come si fa.** ${p.proc}\n\n`;
  if (p.vincolo){
    out += `**Il vincolo.**\n- **Lei:** ${p.vincolo.lei}\n- **Lui:** ${p.vincolo.lui}\n\n`;
  }
  if (p.nota) out += `> ${p.nota}\n\n`;
  out += diff
    ? `**Valori.** ~**${p.val[0]} kcal · ${p.val[1]} g P** (lei) · ~**${vLui[0]} kcal · ${vLui[1]} g P** (lui)\n`
    : `**Valori.** ~**${p.val[0]} kcal · ${p.val[1]} g P**\n`;
  return out + '\n---\n\n';
}

function generaPiano(){
  let out = `# Piano dei pasti — versione definitiva (autunno 2026)\n\n`;
  out += `Nessun pasto è legato a un giorno: sono ${PASTI.filter(p=>p.tipo!=='extra').length} pasti (più ${PASTI.filter(p=>p.tipo==='extra').length} extra) organizzati per categoria, da scegliere liberamente settimana per settimana con l'app.\n\n`;
  out += `Target: **${TARGET.kcal} kcal / ${TARGET.p} g proteine al giorno**, uguale per entrambi, ripartiti in colazione ${TARGET.pasti.colazione} · pranzo ${TARGET.pasti.pranzo} · cena ${TARGET.pasti.cena}. **${TARGET.kcal} kcal è il pavimento: non si scende sotto**, anche nelle settimane senza eccezioni (in quel caso si aggiunge un modulo +150).\n\n`;
  out += `Le quantità sono **per persona**, in grammi salvo unità pz: porzione unica, lei e lui mangiano la stessa quantità salvo le finiture non condivise (soloLei/soloLui). kcal e proteine sono **calcolati dagli ingredienti** (tabella nutrizionale CREA/USDA in \`dati.js\`), non stimati a occhio.\n\n---\n\n`;

  CATEGORIE.forEach(([catId, label]) => {
    const ps = PASTI.filter(p => p.cat === catId);
    if (!ps.length) return;
    out += `# ${label.toUpperCase()}\n\n`;
    ps.forEach(p => out += sezionePasto(p));
  });
  return out;
}

/* ======================================================================
   DOC 2 — preparazione-domenicale.md
   ====================================================================== */
function generaPrep(){
  let out = `# Preparazione domenicale\n\n`;
  out += `> Le basi sono generate da \`dati.js\` e verificate da \`node test.js\`. Le quantità qui sotto sono le ricette a dose piena (o per il numero di porzioni indicato); l'app scala tutto sul fabbisogno reale della settimana che scegli.\n\n---\n\n`;
  out += `# PARTE 1 — Le basi, una per una\n\n`;
  out += `Ordine di esecuzione consigliato: forno per primo (pane, focaccine, muffin, le creme arrostite), soffritto e legumi sui fornelli in parallelo.\n\n---\n\n`;

  BASI.slice().sort((a,b)=>a.ordine-b.ordine).forEach(b => {
    out += `## ${b.ordine} · ${b.nome}\n`;
    out += `**Resa: ~${b.resa} g**`;
    if (b.porz) out += ` (${b.porz} porzioni)`;
    if (b.pezzi) out += ` (${b.pezzi} pezzi)`;
    out += ` · Tempo attivo: ${b.tempoAtt} min · Tempo totale: ${b.tempoTot} min\n\n`;
    out += `| Ingrediente | Quantità |\n|---|---|\n`;
    b.ing.forEach(([n,q]) => {
      const nome = n[0]==='@' ? BASE_BY_ID[n.slice(1)].nome + ' (base)' : n;
      out += `| ${nome} | ${fmtQIng(n[0]==='@'?'x':n, q)} |\n`;
    });
    out += '\n**Procedura**\n';
    (b.proc||[]).forEach((s,i) => out += `${i+1}. ${testoBase(s, b, 1)}\n`);
    out += '\n';
    if (b.nota) out += `> ${testoBase(b.nota, b, 1)}\n\n`;
    out += `Conservazione: frigo ${b.conserva[0]} · freezer ${b.conserva[1]}.\n\n---\n\n`;
  });

  out += `# PARTE 2 — Settimana tipo\n\n`;
  out += `La selezione che carica il pulsante "CARICA LA SETTIMANA TIPO" nell'app. Lei pranza da sola lunedì/mercoledì/venerdì; martedì e giovedì il pranzo è fuori; nel weekend si pranza insieme.\n\n`;
  out += `| Giorno | Colazione | Pranzo | Cena |\n|---|---|---|---|\n`;
  const byId = {}; PASTI.forEach(p => byId[p.id] = p);
  SETTIMANA_TIPO.giorni.forEach(d => {
    const pra = d.pra ? byId[d.pra].nome : '_(fuori)_';
    out += `| ${d.g} | ${byId[d.col].nome} | ${pra} | ${byId[d.cena].nome} |\n`;
  });
  out += '\n';

  // bilancio + lista della spesa calcolati sulla settimana tipo
  const CALC = calcola(SETTIMANA_TIPO.sel, {}, {ING, BASI, PASTI});

  out += `\n# PARTE 3 — Bilancio delle basi (sulla settimana tipo)\n\n`;
  out += `Calcolato da \`node genera-doc.js\` con la stessa \`calcola()\` dell'app — non ricalcolato a mano.\n\n`;
  out += `| Base | Serve | Produce (a dose piena) | Margine |\n|---|---|---|---|\n`;
  BASI.slice().sort((a,b)=>a.ordine-b.ordine).forEach(b => {
    const v = CALC.basi[b.id];
    if (!v) return;
    out += `| ${b.nome} | ${formatta('x', v.serve, ING)} | ${formatta('x', v.produci, ING)} | ${v.avanzo>0?'+':''}${formatta('x', v.avanzo, ING)} |\n`;
  });

  out += `\n# PARTE 4 — Lista della spesa (settimana tipo, ricetta intera dove previsto)\n\n`;
  REPARTI.forEach(([k,label]) => {
    const righe = Object.entries(CALC.ing).filter(([n]) => (ING[n]||{}).r === k).sort((a,b)=>a[0].localeCompare(b[0],'it'));
    if (!righe.length) return;
    out += `**${label}**\n\n| Ingrediente | Quantità |\n|---|---|\n`;
    righe.forEach(([n,q]) => out += `| ${n} | ${formatta(n,q,ING)} |\n`);
    out += '\n';
  });

  out += `\n---\n\n## Totale nutrizionale della settimana tipo\n\n`;
  out += `**${Math.round(CALC.val[0]).toLocaleString('it')} kcal · ${Math.round(CALC.val[1])} g proteine** in totale sui giorni con pranzo in piano; media da confrontare con il target di ${TARGET.kcal} kcal / ${TARGET.p} g P al giorno nell'app, che conta correttamente i giorni con pranzo fuori.\n`;

  return out;
}

const outDir = path.join(__dirname, '..');
fs.writeFileSync(path.join(outDir, 'piano-pasti-definitivo.md'), generaPiano());
fs.writeFileSync(path.join(outDir, 'preparazione-domenicale.md'), generaPrep());
console.log('Scritti piano-pasti-definitivo.md e preparazione-domenicale.md');
