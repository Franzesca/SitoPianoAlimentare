/* ==========================================================================
   Motore: pasti scelti → basi da produrre → ingredienti crudi → dispensa/spesa
   ========================================================================== */

function costruisciIndici(BASI){
  const perId = {};
  BASI.forEach(b => perId[b.id] = b);
  // profondità: una base che ne contiene altre va risolta PRIMA di quelle che contiene
  const prof = {};
  const calc = id => {
    if (prof[id] != null) return prof[id];
    const b = perId[id];
    let d = 0;
    (b.ing||[]).forEach(([n]) => { if (n[0] === '@') d = Math.max(d, 1 + calc(n.slice(1))); });
    return prof[id] = d;
  };
  BASI.forEach(b => calc(b.id));
  return {perId, prof};
}

/*  selezione: { pastoId: n }   n = numero di porzioni totali (entrambi insieme)
    modiBase:  { idBase: 'esatto' | 'intero' }
    ritorna: {ing:{nome:qta}, basi:{id:{serve,produci}}, val:[kcal,p]}  */
function calcola(selezione, modiBase, DATI){
  const {BASI, PASTI, ING} = DATI;
  const {perId, prof} = costruisciIndici(BASI);

  const ing  = {};                 // ingrediente crudo -> quantità
  const need = {};                 // base -> grammi richiesti
  const val  = [0, 0];
  const usoPasti = {};             // base -> grammi richiesti dai soli pasti

  const add = (nome, q) => { if (q) ing[nome] = (ing[nome]||0) + q; };

  PASTI.forEach(p => {
    const n = selezione[p.id] || 0;
    if (!n) return;
    val[0] += p.val[0] * n;
    val[1] += p.val[1] * n;
    (p.ing||[]).forEach(i => {
      // le finiture non condivise valgono solo per metà delle porzioni:
      // in ogni coppia di porzioni, una sola delle due persone la riceve.
      const molt = (i.soloLei || i.soloLui) ? Math.round(n / 2) : n;
      const q = (i.q || 0) * molt;
      if (!q || i.qb) return;
      if (i.b){ need[i.b] = (need[i.b]||0) + q; usoPasti[i.b] = (usoPasti[i.b]||0) + q; }
      else     { add(i.n, q); }
    });
  });

  // risolvi le basi dalla più "esterna" alla più "interna"
  const ordine = BASI.slice().sort((a,b) => prof[b.id] - prof[a.id]);
  const basi = {};
  ordine.forEach(b => {
    const serve = need[b.id] || 0;
    if (!serve) return;
    // default: dose piena solo quando la quantità esatta sarebbe troppo piccola
    // da preparare davvero (es. 40 g di hummus), altrimenti si scala al fabbisogno
    const modo = (modiBase && modiBase[b.id])
      || ((serve < 200 && serve < b.resa * 0.5) ? 'intero' : 'esatto');
    const ricette = Math.max(1, Math.ceil(serve / b.resa - 1e-9));
    const produci = modo === 'intero' ? ricette * b.resa : serve;
    basi[b.id] = {serve, produci, modo, ricette, avanzo: produci - serve};
    const f = produci / b.resa;
    b.ing.forEach(([n, q]) => {
      if (n[0] === '@') need[n.slice(1)] = (need[n.slice(1)]||0) + q * f;
      else add(n, q * f);
    });
  });

  return {ing, basi, val, usoPasti};
}

/* --- formattazione quantità ------------------------------------------------ */
function arrotonda(q, u){
  if (u === 'pz') return Math.round(q * 100) / 100;
  if (q >= 1000)  return Math.round(q / 10) * 10;
  if (q >= 100)   return Math.round(q / 5) * 5;
  if (q >= 20)    return Math.round(q);
  if (q >= 2)     return Math.round(q * 2) / 2;
  return Math.round(q * 10) / 10;
}

function formatta(nome, q, ING){
  const m = ING[nome] || {u:'g'};
  if (m.u === 'pz'){
    const n = Math.ceil(q - 1e-9);
    return n + (n === 1 ? ' pz' : ' pz');
  }
  const r = arrotonda(q, 'g');
  if (m.comeSucco){
    const n = Math.ceil(q / m.pz - 1e-9);
    return n + (n === 1 ? ' frutto' : ' frutti') + ' (~' + r + ' g di succo)';
  }
  if (r >= 1000) return (r/1000).toFixed(r % 1000 === 0 ? 0 : 1).replace('.', ',') + ' kg';
  return String(r).replace('.', ',') + ' g';
}

if (typeof module !== 'undefined') module.exports = {calcola, formatta, arrotonda, costruisciIndici};
