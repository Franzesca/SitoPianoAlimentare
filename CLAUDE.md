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
node build.js             # riscrive ../cucina.html
node test.js              # verifiche incrociate contro i documenti
node audit-nutrizionale.js   # stima kcal/proteine dagli ingredienti grezzi, pasto per pasto
```

- `sorgenti/dati.js` — registro ingredienti (`ING`), le 14 basi (`BASI`), i 27 pasti (`PASTI`), i target. **È qui che si aggiungono o correggono pasti.**
- `sorgenti/motore.js` — `calcola()`: esplode ricorsivamente le basi negli ingredienti crudi scalando sulla resa, e `formatta()` per le quantità.
- `sorgenti/app.js` — tutta la UI: catalogo, lista, dispensa/spesa, basi, peso.
- `sorgenti/auth.js` — login, registrazione, creazione/adesione a un household.
- `sorgenti/firebase-config.js` — chiavi del progetto Firebase.
- `sorgenti/shell.html` — struttura HTML e CSS. I segnaposto `/*__FIREBASE_CONFIG__*/`, `/*__AUTH__*/`, `/*__DATI__*/`, `/*__MOTORE__*/`, `/*__APP__*/` vengono sostituiti da build.js, in quest'ordine, dentro un unico `<script type="module">`.
- `sorgenti/audit-nutrizionale.js` — non entra in `cucina.html`. Esplode ogni pasto nei
  suoi ingredienti grezzi (via `calcola()`, lo stesso motore dell'app) e li confronta con
  una tabella di riferimento nutrizionale (kcal/proteine per 100 g, valori standard tipo
  USDA/CREA — non i dati dei prodotti realmente comprati). Segnala i pasti dove lo scarto
  supera il 15% e 30 kcal. È un controllo di plausibilità, non una fonte: se un pasto
  viene segnalato, il numero da correggere in `dati.js` deve comunque venire da una fonte
  nutrizionale vera, non dalla stima di questo script.

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

### Scorte, archiviazione, ricette proprie (dal 2026-08-21)

`PASTI`/`BASI`/`ING` restano statici da `dati.js` — le funzionalità sotto vivono
tutte come override/aggiunte in Firestore, per household, e si fondono con i
dati statici solo a runtime in `sorgenti/app.js`:

- `households/{id}/scorte/corrente` — dispensa virtuale (`ingredienti`/`basi`,
  booleano acceso/spento). `households/{id}/importanza/corrente` — override
  per-ingrediente del livello (`fondamentale`/`medio`/`opzionale`); default
  calcolato dal reparto se non sovrascritto (`importanzaDefault()` in app.js).
- `households/{id}/pastiExtra/{pastoId}` — override su un pasto esistente
  (`nome`, `tempo`, `difficolta`, `nota`, `archiviato`, e ora anche `ing` —
  lista ingredienti completa, sostituisce quella di `dati.js` — e `proc` —
  procedura/modalità di cottura). Si applicano sia ai 27 pasti di `dati.js`
  sia alle ricette proprie sotto, quindi anche una ricetta "mia" può avere un
  override sopra. Un pasto senza documento qui usa `dati.js`/la ricetta
  originale così com'è. **`ing`/`proc` non toccano `val` (kcal/proteine)**:
  se cambi ingredienti in modo sostanziale, il kcal/proteine mostrato resta
  quello dichiarato originariamente e può non essere più accurato — l'app non
  lo ricalcola da sola (vedi "Non inventare valori nutrizionali" sotto).
- `households/{id}/ricetteExtra/{autoId}` — ricette create da zero dal form
  "+ Nuova ricetta" in Pasti. Stessa forma di un pasto di `dati.js` (`ing`,
  `val`, ecc.) più `mia:true`. kcal è obbligatorio in quel form (proteine no)
  per evitare che una ricetta senza dati nutrizionali sommi silenziosamente
  zero nei totali della settimana.
- `PASTO_BY_ID`/`tuttiIPasti()` in `app.js` contengono sempre i pasti (i 27 +
  le ricette proprie) già fusi con `pastoEffettivo()` — ricostruiti da
  `ricostruisciPastoById()` a ogni cambiamento di `pastiExtra`/`ricetteExtra`.
  Così `calcola()`, la ricerca nel catalogo, `pastoFattibile()` ecc. vedono
  automaticamente ingredienti/procedura modificati senza dover richiamare
  `pastoEffettivo()` in ogni punto — se aggiungi un nuovo posto che legge un
  pasto, prendilo da `tuttiIPasti()`/`PASTO_BY_ID`, non da `PASTI` diretto.
  Usato ovunque al posto di `PASTI` diretto (catalogo, lista, calcolo,
  Scorte) — eccetto "Carica la settimana intera", che resta scoped ai soli
  27 originali.
- `households/{id}/wishlist/{autoId}` — semplici promemoria (`nome`, `link`,
  `nota`), non sono pasti veri: niente ingredienti, non entrano nel calcolo.

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

- **Non scrivere mai l'intero documento `stato/corrente` (o `scorte/corrente`/
  `importanza/corrente`) con `setDoc`.** Le scritture condivise passano da
  `syncStato()`/`syncScorte()`/`syncImportanza()` in `app.js`, che aggiornano
  con `updateDoc` solo il campo puntato cambiato (es. `sel.<pastoId>`). Due
  persone possono modificare l'household nello stesso momento da telefoni
  diversi: un `setDoc` dell'intero oggetto sovrascriverebbe silenziosamente
  la modifica dell'altra persona se il suo snapshot arriva durante la
  finestra di debounce (400 ms). Le voci "fuori piano" (testo libero in
  `extra`/`preso`) sono un'eccezione: usano `FieldPath`/`arrayUnion`/
  `arrayRemove` invece di un percorso puntato stringa, perché il testo può
  contenere un punto che verrebbe letto come chiave annidata.
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
- **Le stime kcal/proteine dei pasti tendono a essere sottostimate**, non sovrastimate:
  un audit contro una tabella nutrizionale di riferimento (`audit-nutrizionale.js`,
  2026-08-21) su tutti i pasti trova la stima calcolata più alta di quella dichiarata
  in 24 pasti su 26, mediamente +8% sull'intera settimana. I peggiori sono i piatti con
  legumi secchi o cereali in dose piena (chana saag, harira, kofta, wrap di falafel,
  lenticchie e polenta): il peso a crudo dei legumi pesa più di quanto sembri a occhio.
  Se aggiungi un pasto nuovo con legumi/cereali/carne in quantità simili, gira lo script
  prima di fidarti del numero.
