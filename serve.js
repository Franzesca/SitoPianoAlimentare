/* Server statico minimo, solo per test in locale (Google Sign-In richiede http/https, non file://).
   Uso: node serve.js  →  apri http://localhost:5173/cucina.html
   Non serve per la messa online vera (quella sarà GitHub Pages). */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const TIPI = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/cucina.html';
  const file = path.join(__dirname, p);
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end('Vietato'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Non trovato: ' + p); }
    res.writeHead(200, { 'Content-Type': TIPI[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Server pronto: http://localhost:${PORT}/cucina.html`));
