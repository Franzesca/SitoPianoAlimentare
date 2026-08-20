# DietaCosi

Piano alimentare settimanale per una coppia, costruito su batch cooking domenicale,
più la web app `cucina.html` che lo rende usabile.

## Il vincolo che spiega tutto

Lui non tollera verdura e frutta crude o poco processate. La soluzione strutturale è il
**soffritto lungo frullato** (verdure cotte 90 minuti e passate al mixer) e il principio
**"una pentola, due finiture"**: nel piatto di lei le finiture crude (coriandolo, lime,
cipolla rossa), in quello di lui le stesse note da salse cotte o frullate.

**Dal 2026-08-20, porzione unica:** lui mangia le stesse grammature di lei — resta solo
la differenza di consistenza (crudo per lei, cotto/frullato per lui), non più una
differenza di quantità.

Target: 1.450 kcal / 115 g proteine, uguale per entrambi.

## I file

| File | Cos'è |
|---|---|
| `piano-pasti-definitivo.md` | **Fonte autorevole dei pasti.** 27 pasti, ingredienti divisi basi/fresco in grammi (porzione unica), procedure, varianti vincolo, stime kcal/proteine. |
| `preparazione-domenicale.md` | **Fonte autorevole delle basi.** 14 preparazioni domenicali con rese e ingredienti crudi lordi, mappa pasti→basi, bilancio delle basi. |
| `piano-alimentare-settimanale.md` | Prima versione, superata. Utile solo per fabbisogni, sostituzioni e taratura. |
| `cucina.html` | **La web app attuale.** Generata da `sorgenti/`, non modificarla a mano. |
| `sorgenti/` | I sorgenti di `cucina.html`. |
| `piano-cucina.html` | Vecchia app ordinata per giorno, sui valori della prima versione. Backup, non toccare. |
| `Cucina — piano settimanale.html` + `_files/` | Salvataggio da browser di `piano-cucina.html`. Non è una fonte. |

## Come si lavora su cucina.html

**Non editare `cucina.html`: è generato.** Modifica i sorgenti e ricompila.

```bash
cd sorgenti
node build.js     # riscrive ../cucina.html
node test.js      # verifiche incrociate contro i documenti
```

- `sorgenti/dati.js` — registro ingredienti (`ING`), le 14 basi (`BASI`), i 27 pasti (`PASTI`), i target. **È qui che si aggiungono o correggono pasti.**
- `sorgenti/motore.js` — `calcola()`: esplode ricorsivamente le basi negli ingredienti crudi scalando sulla resa, e `formatta()` per le quantità.
- `sorgenti/app.js` — tutta la UI: catalogo, lista, dispensa/spesa, basi, peso.
- `sorgenti/auth.js` — login, registrazione, creazione/adesione a un household.
- `sorgenti/firebase-config.js` — chiavi del progetto Firebase.
- `sorgenti/shell.html` — struttura HTML e CSS. I segnaposto `/*__FIREBASE_CONFIG__*/`, `/*__AUTH__*/`, `/*__DATI__*/`, `/*__MOTORE__*/`, `/*__APP__*/` vengono sostituiti da build.js, in quest'ordine, dentro un unico `<script type="module">`.

## Account e dati condivisi

Dal 2026-08-20 l'app richiede login (Firebase Auth) e i dati di pianificazione
(pasti scelti, dispensa, spesa, basi) sono condivisi in tempo reale tra i due
account collegati allo stesso "household" — non più `localStorage` come unica
fonte. Il peso resta personale, attribuito automaticamente a chi è loggato.

- `sorgenti/firebase-config.js` — chiavi del progetto Firebase (pubbliche per
  design, la sicurezza è nelle regole Firestore).
- `sorgenti/auth.js` — login, registrazione, creazione/adesione a un household
  tramite codice condiviso, gestisce la schermata di accesso.
- `firestore.rules` (radice del progetto) — regole di sicurezza: un utente legge/
  scrive solo l'household a cui il proprio profilo è collegato, e scrive solo il
  proprio peso. Da pubblicare manualmente sulla console Firebase dopo ogni modifica.
- In `sorgenti/app.js`, `stato.sel/modiBase/hoGia/preso/extra` vivono ora su
  Firestore (`households/{id}/stato/corrente`, sincronizzato con `onSnapshot`);
  `stato.pesi` vive in `households/{id}/pesi` (una collezione, non un documento
  solo); `stato.aperti/grp/filtro/passo` restano in `localStorage` — sono
  preferenze del dispositivo, non dati da condividere.
- `localStorage['dietacosi.v1']` (il vecchio formato) resta leggibile solo per la
  migrazione una tantum al primo accesso — non è più scritto da nessuna parte.

## Regole del modello dati

- Le quantità nei pasti sono **per persona**, in grammi salvo unità `pz` — lei e lui
  mangiano la stessa quantità, salvo le finiture non condivise (vedi sotto).
- Un ingrediente che è una base si scrive `{b:'soffritto', q:120}`; uno fresco
  `{n:'Uova', q:2}`. Il nome deve esistere in `ING`, o `test.js` lo segnala.
- Le finiture non condivise portano un flag: `soloLei:true` (finitura a crudo, resta
  solo nel piatto di lei) o `soloLui:true` (equivalente cotto/frullato, resta solo nel
  piatto di lui). Sono tre casi in tutto il piano: la salsa di peperoni e la cipolla
  stufata (sostituti cotti per lui) e la vellutata dell'hot dog di sabato (unico pasto
  dove il contorno resta strutturalmente diverso, non solo di consistenza). In
  `calcola()`, un ingrediente con uno di questi due flag pesa su **metà** delle porzioni
  selezionate (una finitura a testa in ogni coppia di porzioni), gli altri su tutte.
- Le **basi annidate** si scrivono `['@soffritto', 600]` dentro `BASI`. Il chili contiene
  soffritto+ceci+fagioli, il ragù contiene soffritto, l'hummus contiene ceci. `calcola()` le
  risolve per profondità decrescente, quindi l'ordine nell'array non conta.
- Ogni base ha un interruttore *quantità esatta* / *ricetta intera*. Default: "intero"
  solo sotto i 200 g (non ha senso preparare 40 g di hummus).
- Lo stato sta in `localStorage` sotto `dietacosi.v1`. `stato.sel[pastoId]` è un numero
  (porzioni totali selezionate, non più `{lei,lui}`).

## Vincoli da non rompere

- **Non inventare valori nutrizionali.** Tutte le grammature e le stime vengono dai due
  documenti autorevoli. Due eccezioni dichiarate: il pranzo di venerdì (`ven-pra`, pasta
  al pomodoro con pollo sfilacciato, valori stimati) e l'hot dog di sabato (`sab-pra`,
  dove il valore kcal/proteine mostrato è quello di lei ma il contorno di lui pesa un
  po' di più, non quantificato) — entrambe scritte nella `nota` del pasto.
- **Il pulled chicken ha margine comodo:** 640 g sfilacciati sulla settimana contro una
  resa di 890 g (+250 g). Prima della porzione unica era a somma quasi zero; ora c'è
  spazio.
- **Il soffritto dipende da come si preparano chili e ragù.** Se si scalano entrambi alla
  quantità esatta (il comportamento di default dell'app per basi sopra i 200 g), servono
  ~3.070 g contro 3.300 g di resa: comodo. Se invece si preparano **entrambi** a ricetta
  intera (per fare scorta in freezer, come descritto in preparazione-domenicale.md),
  servono ~3.420 g: **120 g più della resa**, perché chili e ragù a dose piena prelevano
  comunque 600 g + 400 g di soffritto fissi, indipendentemente da quanto verrà davvero
  mangiato. Non fare entrambe le basi a ricetta intera nella stessa domenica senza
  controllare il margine soffritto in app.
- `test.js` verifica queste quantità contro i documenti. Falle passare prima di dire
  che una modifica è finita.
