/* Assembla i sorgenti in ../cucina.html
   Uso:  node build.js     (dalla cartella sorgenti/)                        */
const fs = require('fs');
const path = require('path');
const qui = __dirname;
const out = path.join(qui, '..', 'cucina.html');

const strip = s => s.replace(/^if \(typeof module[^\n]*\n?/m, '');
const leggi = f => fs.readFileSync(path.join(qui, f), 'utf8');

let html = leggi('shell.html');
const inserisci = (segna, file, f) => { html = html.replace(segna, () => f(leggi(file))); };
inserisci('/*__FIREBASE_CONFIG__*/', 'firebase-config.js', s => s);
inserisci('/*__AUTH__*/',            'auth.js',            s => s);
inserisci('/*__DATI__*/',            'dati.js',             strip);
inserisci('/*__MOTORE__*/',          'motore.js',           strip);
inserisci('/*__APP__*/',             'app.js',              s => s);

fs.writeFileSync(out, html);
console.log('Scritto ' + out + '  (' + (html.length/1024).toFixed(1) + ' KB)');
