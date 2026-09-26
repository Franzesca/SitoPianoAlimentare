// Assembla ../cucina.html da shell.html + i moduli.
// I segnaposto stanno tutti dentro l'unico <script type="module"> di shell.html
// e vengono sostituiti in quest'ordine.
//   node build.js
const fs = require('fs');
const path = require('path');

const qui = __dirname;
const leggi = f => fs.readFileSync(path.join(qui, f), 'utf8');

const pezzi = [
  ['/*__FIREBASE_CONFIG__*/', 'firebase-config.js'],
  ['/*__AUTH__*/',            'auth.js'],
  ['/*__DATI__*/',            'dati.js'],
  ['/*__MOTORE__*/',          'motore.js'],
  ['/*__APP__*/',             'app.js'],
];

let html = leggi('shell.html');
for (const [segnaposto, file] of pezzi) {
  if (!html.includes(segnaposto)) throw new Error('Segnaposto mancante in shell.html: ' + segnaposto);
  const contenuto = leggi(file).replace(/\s+$/, '');
  // funzione al posto della stringa: così un "$&" o "$1" dentro il codice non viene interpretato
  html = html.replace(segnaposto, () => contenuto);
}
const out = path.join(qui, '..', 'cucina.html');
fs.writeFileSync(out, html);
console.log('Scritto ' + out + ' (' + html.length + ' caratteri)');
