# DietaCosi — Scorte (dispensa virtuale) e archiviazione ricette

Data: 2026-08-21. Stato: approvato.

## Cosa costruisco

Progetto 3 (dispensa virtuale) più una fetta leggera del Progetto 2 (editing
minimo + archiviazione), uniti perché condividono la stessa superficie UI.

## Modello dati (Firestore, per household)

- `households/{id}/scorte/corrente` → `{ ingredienti:{nome:bool}, basi:{id:bool} }`
- `households/{id}/importanza/corrente` → `{ ingredienti:{nome:livello}, basi:{id:livello} }`,
  solo le voci che l'utente ha esplicitamente cambiato rispetto al default.
  `livello` ∈ `fondamentale | medio | opzionale`.
- `households/{id}/pastiExtra/{pastoId}` → `{ archiviato?, nome?, tempo?, difficolta?, nota? }`,
  documento creato solo quando c'è almeno un override. Assente = usa i valori di
  `dati.js` così come sono.

Default di importanza (usato quando non c'è un override): basi → `fondamentale`;
ingredienti con reparto `spezie` o `dispensa` → `opzionale`; tutti gli altri →
`fondamentale`.

## Logica

- **Fattibilità di un pasto**: per ogni suo ingrediente/base, se `opzionale` →
  ignora. Se `fondamentale` e non "acceso" nelle scorte → il pasto non è
  suggeribile. Se `medio` e non acceso → il pasto resta suggeribile ma viene
  segnalato ("ti manca: coriandolo fresco").
- **"L'ho cucinato"** (bottone su ogni pasto in Lista): spegne le scorte di
  ingredienti/basi con importanza `fondamentale` o `medio` usati da quel pasto.
  Gli `opzionale` non vengono mai toccati automaticamente.
- **"Ho preparato questa base"** (bottone su ogni base in Basi): accende quella
  base nelle scorte, spegne le materie prime (fondamentale/medio) della sua
  ricetta.
- **Spuntare un ingrediente come comprato** nella Spesa esistente (`stato.preso`):
  accende anche la scorta corrispondente — unico punto di contatto con il
  flusso spesa/dispensa già esistente, che per il resto resta invariato.
- **Toggle manuale**: sempre disponibile su ogni riga della scheda Scorte,
  indipendentemente da tutto il resto.

## UI

Nuova scheda in nav, **Scorte**, tra Pasti e Lista. Contiene:
1. "Puoi cucinare adesso" — pasti fattibili, con eventuali avvisi "medio".
2. Elenco completo per reparto (ingredienti) + sezione basi, ciascuna riga con
   interruttore acceso/spento e tre pillole cliccabili per il livello di
   importanza (evidenzia quella attiva).

Su ogni pasto (in Pasti/Lista): bottone **Archivia/Disarchivia** (i pasti
archiviati spariscono da catalogo/lista/suggerimenti; un link "Mostra
archiviati" nella vista Pasti li recupera) e un piccolo **Modifica** che rende
editabili nome, tempo, difficoltà e una nota libera, con Salva/Annulla.

## Fuori ambito

Editing di ingredienti/quantità (rimandato al form di creazione ricette,
Progetto 2 completo). Eliminazione definitiva dei 27 pasti base (vivono nel
codice condiviso, non in Firestore) — solo archiviazione.
