// Assembla ../cucina.html da shell.html + i moduli e rigenera i documenti.
//
//   node build.js                  test → build → controllo sintassi → documenti
//   node build.js --senza-test     salta i test (solo per provare qualcosa al volo)
//
// Si ferma PRIMA di scrivere cucina.html se i test falliscono, e DOPO averlo
// scritto se lo script dentro non è sintatticamente valido: così non si
// pubblica per sbaglio un'app rotta, né documenti rimasti indietro rispetto
// ai dati (piano-pasti-definitivo.md e preparazione-domenicale.md).
//
// I segnaposto stanno tutti dentro l'unico <script type="module"> di shell.html
// e vengono sostituiti in quest'ordine.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const qui = __dirname;
const leggi = f => fs.readFileSync(path.join(qui, f), 'utf8');
const esegui = (script, args = []) =>
  spawnSync(process.execPath, [path.join(qui, script), ...args], { stdio: 'inherit' });
const esci = msg => { console.error('\n✗ ' + msg); process.exit(1); };

// 1. test (prima di scrivere qualsiasi cosa)
if (!process.argv.includes('--senza-test')) {
  console.log('— Test');
  if (esegui('test.js').status !== 0) esci('I test non passano: cucina.html NON è stato scritto.');
}

// 2. assemblaggio
const pezzi = [
  ['/*__FIREBASE_CONFIG__*/', 'firebase-config.js'],
  ['/*__AUTH__*/',            'auth.js'],
  ['/*__DATI__*/',            'dati.js'],
  ['/*__MOTORE__*/',          'motore.js'],
  ['/*__APP__*/',             'app.js'],
];
let html = leggi('shell.html');
for (const [segnaposto, file] of pezzi) {
  if (!html.includes(segnaposto)) esci('Segnaposto mancante in shell.html: ' + segnaposto);
  const contenuto = leggi(file).replace(/\s+$/, '');
  // funzione al posto della stringa: così un "$&" o "$1" dentro il codice non viene interpretato
  html = html.replace(segnaposto, () => contenuto);
}
const out = path.join(qui, '..', 'cucina.html');
fs.writeFileSync(out, html);
console.log('\n— Scritto ' + out + ' (' + html.length + ' caratteri)');

// 3. lo script dentro cucina.html deve essere sintatticamente valido
const moduli = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
if (!moduli.length) esci('Nessun <script type="module"> in cucina.html.');
const tmp = path.join(os.tmpdir(), 'dietacosi-controllo-' + process.pid + '.mjs');
fs.writeFileSync(tmp, moduli[moduli.length - 1][1]);
const sintassi = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
fs.rmSync(tmp, { force: true });
if (sintassi.status !== 0) esci('Errore di sintassi nello script di cucina.html:\n' + (sintassi.stderr || '').split('\n').slice(0, 8).join('\n'));
console.log('— Sintassi dello script: ok');

// 4. documenti generati dai dati
console.log('— Documenti');
if (esegui('genera-doc.js').status !== 0) esci('genera-doc.js è fallito.');
