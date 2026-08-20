# DietaCosi — compatibilità Google Sites + porzione unica

Data: 2026-08-20
Stato: approvato dall'utente, in attesa di piano di implementazione.

## Contesto

Due richieste indipendenti:

1. Rendere `cucina.html` incorporabile in una pagina Google Sites.
2. Eliminare la distinzione Lei/Lui dal piano pasti: lui ha chiesto di mangiare le
   porzioni di lei, il che risolve anche la parte più fiddly della cucina (pesare
   due quantità diverse per ogni ingrediente).

Decisioni prese durante il brainstorming (in ordine):

- Incorporamento: **Da URL** (iframe), non "Incorpora codice" — Google Sites non
  esegue `<script>` nel gadget di codice incollato, e questa è una web app.
- Hosting: **GitHub Pages** (non deciso oggi se/quando fare il deploy — è
  un'azione separata che tocca stato condiviso, si farà quando l'utente è pronto).
- Motivo della rimozione di "Lui": non è un cambio di chi mangia (restano in due),
  è un'unificazione delle porzioni. Lui adotta le grammature di lei.
- Il vincolo di lui su crudo/cotto **resta**: stessa grammatura per entrambi, ma
  le finiture a crudo restano solo nel piatto di lei; lui continua con
  l'equivalente cotto/frullato, esattamente come oggi.
- Ambito: **anche i due documenti autorevoli** (`piano-pasti-definitivo.md`,
  `preparazione-domenicale.md`) vengono aggiornati, non solo l'app — restano la
  fonte di verità e `test.js` deve continuare a verificarli.
- Le **rese delle basi domenicali restano quelle attuali** (stessi ingredienti
  lordi, stessi tempi): con consumi più bassi avanza più roba in freezer, non si
  ridimensiona nulla in cucina.
- La scheda **Peso resta invariata** (due persone): è un diario corporeo
  indipendente dal piano pasti, non c'entra con le porzioni.
- Nella lista pasti, i due stepper indipendenti lei/lui diventano **un contatore
  solo** (quante porzioni in tutto).

---

## Parte 1 — Compatibilità Google Sites

**Obiettivo:** il file, ospitato su un URL statico (GitHub Pages), deve
funzionare bene dentro un iframe incorporato via "Da URL" in Google Sites.

Cosa cambia in `sorgenti/shell.html` / `sorgenti/app.js`:

- Aggiungere un link "Apri a schermo intero ↗" in testa alla pagina (dentro
  `.hbar` o subito sotto), **visibile solo se la pagina gira in un iframe**
  (`window.self !== window.top`), che apre `location.href` in una nuova scheda
  (`target="_blank"`).
  - Motivo: dentro un iframe di terze parti, alcuni browser (Safari/ITP in
    particolare) limitano o azzerano il `localStorage`. Se lo stato (spesa
    spuntata, dispensa, peso) si perde, l'utente ha sempre una via d'uscita che
    garantisce persistenza piena (stesso URL, ma non incorniciato).
- Nessuna modifica a header/nav (`position:fixed`): dentro un iframe hanno un
  proprio viewport e si comportano correttamente.
- Nessuna modifica di hosting in questo lavoro: creare il repo GitHub e
  abilitare Pages resta un passo successivo, a parte, quando l'utente vorrà.

File toccati: `sorgenti/shell.html`, `sorgenti/app.js`, poi `node build.js`.

---

## Parte 2 — Porzione unica

### Regola di conversione (applicata a tutti i 26 pasti)

Per ogni ingrediente di ogni pasto in `PASTI`:

- **Ingrediente condiviso** (proteina, base, carboidrato, condimento comune —
  cioè tutto tranne le finiture marcate `lei:true` nel registro `ING`): il
  valore per `lui` diventa uguale al valore per `lei`.
- **Finitura a crudo** (`ING[nome].lei === true`, es. cipolla rossa, pomodoro
  fresco, coriandolo fresco, cetriolo, kimchi, menta fresca, insalata mista,
  pomodorini, cipollotto): resta `lui:0` come oggi, nessun cambiamento.
- **Equivalente cotto/frullato di lui** (es. cipolle caramellate al posto della
  cipolla cruda, salsa peperoni al posto delle verdure fresche, cipolla stufata
  al posto del kimchi): resta nel piatto di lui. Dove il suo peso era
  dimensionato sulla porzione più grande di lui, lo riduco per restare
  proporzionato alla nuova porzione condivisa, **senza inventare valori
  nutrizionali** — è una scelta di ricetta, non un dato stimato.
- `val.lui` (kcal, proteine per pasto) diventa uguale a `val.lei` per **tutti i
  pasti tranne uno** (vedi eccezione sotto).

### L'unica eccezione: hot dog di sabato (`sab-pra`)

È l'unico pasto dove il piatto di lui non è "stessa cosa, finitura diversa" ma
un contorno strutturalmente diverso (vellutata calda invece di insalata a
crudo) — già oggi il testo lo segnala come il solo caso in cui la differenza
resta visibile. Salsiccia, cipolle caramellate e panino scendono alla
grammatura di lei; la vellutata di lui resta 250 g com'è oggi (ricalcolarla
richiederebbe inventare una conversione kcal che i documenti non forniscono).
`val.lui` per questo pasto **non** viene forzato uguale a `val.lei`: resta un
numero indipendente, marcato con una nota — stesso trattamento già riservato al
pranzo di venerdì (`ven-pra`), l'unica altra stima dichiarata nel piano.

### Target

`TARGET` passa da due target separati a uno solo: `{kcal:1450, p:115}` (i
valori attuali di lei) — conseguenza diretta di mangiare le stesse porzioni.
Il "pasto libero" della domenica (`dom-cen`, pizza ogni 2-3 settimane) segue la
stessa logica: il budget kcal di lui converge su quello di lei.

### Pulizia dati collegata

Tre pasti (`mar-col`, `mer-pra`, `gio-col`) usano oggi due *SKU diversi* di
tortilla — "media" per lei, "grande" per lui — non solo quantità diverse.
Con la porzione unica, tutti e tre passano a "media": la voce **"Tortilla
integrale grande" nel registro `ING` risulta non più referenziata da nessun
pasto** e va rimossa (non lasciare dati morti). Da verificare durante
l'implementazione se esistono altri casi analoghi (SKU diverso, non solo
quantità diversa) oltre a questo.

### File toccati

- `sorgenti/dati.js` — ogni `ing` di ogni pasto passa da `{lei,lui}` a un
  singolo valore; `val` idem; `TARGET` diventa flat. **Trasformazione fatta con
  uno script**, non a mano (200+ righe coinvolte, il rischio di trascrizione a
  mano è troppo alto).
- `sorgenti/motore.js` — `calcola()` perde il loop `['lei','lui']`: un solo
  accumulatore per `ing`/`need`/`val`. `selezione[pastoId]` passa da
  `{lei:n,lui:n}` a un numero singolo.
- `sorgenti/app.js` — rimozione selettore header LEI/DUE/LUI, tabella grammi a
  una colonna, stepper singolo per pasto, riepilogo settimanale con un solo
  blocco invece di due, migrazione leggera dello stato salvato
  (`{lei,lui}` → `lei+lui` sommati, se trovato in `localStorage`).
- `sorgenti/shell.html` — CSS: rimuove le regole `body[data-chi=...]`, la
  tabella `.gram` passa sempre a 2 colonne, tolto `.pill.lui` / `.q.lui`.
- `piano-pasti-definitivo.md` — ogni tabella pasto passa da due colonne
  (Lei/Lui) a una; le stringhe "Lei ~X kcal · Lui ~Y kcal" diventano un solo
  valore (tranne `sab-pra`); target ricalcolato in testa e nei totali giorno.
- `preparazione-domenicale.md` — "Mappa pasti → preparazioni" e "Bilancio delle
  basi" ricalcolati sui nuovi consumi (rese invariate); "Lista della spesa"
  aggiornata di conseguenza.
- `CLAUDE.md` — sezione "Il vincolo che spiega tutto" (target unico), sezione
  "Regole del modello dati" (ingrediente ora `{b:..., q:...}` /
  `{n:..., q:...}` invece di `{lei,lui}`), sezione "Vincoli da non rompere"
  (le cifre soffritto/pulled-chicken vanno ricalcolate con i margini reali, che
  ora saranno più ampi).
- `sorgenti/test.js` — nuove costanti attese, ricavate dal motore dopo la
  modifica, non ricalcolate a mano.

### Verifica (perché i conti siano affidabili, non a occhio)

1. Applico la trasformazione a `dati.js` via script.
2. Faccio girare `node test.js`: usa `calcola()` (il motore esistente) per
   produrre i numeri reali — consumo per base, margini, media kcal/proteine
   settimanale, lista della spesa. Non ricalcolo niente a mano prima di questo
   passo.
3. Controllo incrociato: per ogni base, il nuovo consumo dev'essere ≤ al
   consumo di prima (le porzioni sono scese, mai salite) e comunque ≤ alla resa
   della ricetta — se una qualunque base sfora, mi fermo e indago prima di
   proseguire.
4. Ripeto il controllo una seconda volta con un ricalcolo indipendente a mano
   su 2-3 pasti campione (uno con base annidata come il chili, uno con
   ingrediente fresco semplice) per intercettare eventuali bug nello script di
   trasformazione, non solo nei dati.
5. Solo a questo punto trascrivo i numeri verificati nei due documenti
   autorevoli, in `CLAUDE.md` e aggiorno le costanti attese in `test.js`.
6. `node test.js` deve risultare pulito (nessuna divergenza) come condizione
   per considerare il lavoro finito.

---

## Fuori ambito (esplicitamente escluso in questo lavoro)

- Ridimensionare le ricette/rese delle basi domenicali.
- Toccare la scheda Peso (resta per due persone).
- Creare il repository GitHub / abilitare GitHub Pages / fare il deploy reale
  su Google Sites (passo successivo, a parte).
- `piano-alimentare-settimanale.md`, `piano-cucina.html` e la cartella
  `Cucina — piano settimanale_files` restano come sono: documenti superati,
  non fonte di verità.
