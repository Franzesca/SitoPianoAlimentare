# DietaCosi — account e dati condivisi (Progetto 1 di 4)

Data: 2026-08-20
Stato: approvato dall'utente nelle grandi linee, dettagli tecnici in attesa di conferma.

## Contesto

Primo di quattro sotto-progetti verso un'app usabile da lei e dal suo ragazzo con dati
condivisi:

1. **Account e dati condivisi** (questo documento) — fondamenta.
2. Form per aggiungere ricette proprie.
3. Dispensa virtuale con suggerimenti "cosa posso cucinare".
4. Pagina "pasti da provare" (wishlist separata dalla lista della settimana).

I progetti 2-4 hanno ciascuno domande di design proprie e vengono affrontati dopo,
uno alla volta, con un proprio ciclo spec → piano → implementazione.

Decisioni prese durante il brainstorming:

- **Login vero e proprio per ciascuno** (non un ID condiviso senza password) —
  scelto esplicitamente perché in futuro potrebbero servire funzioni personali,
  come il peso, già oggi diviso lei/lui.
- **Firebase** (Auth + Firestore) come backend — evita di costruire e ospitare un
  server proprio; l'app resta file statici, il pacchetto Firebase si carica da CDN
  come modulo ES, nessun build system aggiunto.
- **Collegamento tra i due account: codice famiglia**, inserito una volta sola dal
  secondo che si registra. Niente invii email da configurare.

---

## Architettura

### Cosa diventa condiviso vs personale vs locale

| Dato | Oggi | Domani |
|---|---|---|
| `sel` (pasti scelti + porzioni) | `localStorage` | Firestore, condiviso, in tempo reale |
| `modiBase` (esatto/intero per base) | `localStorage` | Firestore, condiviso |
| `hoGia` (spunte dispensa) | `localStorage` | Firestore, condiviso |
| `preso` (spunte spesa) | `localStorage` | Firestore, condiviso |
| `extra` (voci fuori piano) | `localStorage` | Firestore, condiviso |
| `pesi` (misure di peso) | `localStorage`, tag `lei`/`lui` manuale | Firestore, tag `uid` di chi l'ha inserita, visibile a entrambi come oggi (due linee sul grafico) |
| `aperti`, `grp`, `filtro`, `passo` | `localStorage` | **Restano in `localStorage`**: preferenze del dispositivo, non ha senso sincronizzarle |

`PASTI`/`ING`/`BASI` (il catalogo ricette) **restano statici da `dati.js`** in questo
progetto — diventeranno editabili nel Progetto 2, non qui.

### Schema Firestore

```
users/{uid}
  email: string
  nome: string          // per etichettare il grafico del peso, es. "Damiana"
  householdId: string   // riferimento a households/{householdId}

households/{householdId}          // id documento generato da Firestore = il "codice famiglia"
  creatoDa: uid
  creatoIl: timestamp

households/{householdId}/stato/corrente
  sel, modiBase, hoGia, preso, extra    // stesso shape di oggi, un documento solo

households/{householdId}/pesi/{autoId}
  uid: string
  nome: string     // copiato da users/{uid}.nome al momento del salvataggio, per non fare join in lettura
  data: string      // YYYY-MM-DD
  kg: number
```

**Il "codice famiglia" è l'ID del documento household**, generato da Firestore
(~20 caratteri, casuale, non enumerabile in pratica). Niente Cloud Function per
risolverlo: chi crea la famiglia lo vede a schermo con un pulsante "copia", chi si
unisce lo incolla. È lungo da leggere a voce ma pensato per essere copiato — via
messaggio, non dettato. Alternativa scartata: un codice corto (6 cifre) avrebbe
richiesto una Cloud Function per risolverlo senza esporre la lista degli household
esistenti — complessità in più per un'app a due persone, non giustificata.

### Regole di sicurezza Firestore (bozza)

```
match /users/{uid} {
  allow read, write: if request.auth.uid == uid;
}
match /households/{hid} {
  allow create: if request.auth != null;
  allow read: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.householdId == hid;
}
match /households/{hid}/stato/{doc} {
  allow read, write: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.householdId == hid;
}
match /households/{hid}/pesi/{doc} {
  allow read: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.householdId == hid;
  allow create: if request.auth != null
    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.householdId == hid
    && request.resource.data.uid == request.auth.uid;   // ognuno scrive solo il proprio peso
  allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
}
```

Un utente può leggere/scrivere solo l'household a cui il proprio `users/{uid}.householdId`
punta, e può scrivere misure di peso solo a proprio nome. Da testare esplicitamente
prima di considerare il progetto finito (vedi Task di verifica nel piano).

### Flusso di autenticazione

1. Apri l'app → se non sei loggata, schermata login/registrazione (email + password +
   **nome visualizzato**, quest'ultimo salvato su `users/{uid}.nome` e usato solo per
   etichettare il grafico del peso — Firebase Auth gestisce solo email/password, il
   nome lo scriviamo noi nel documento utente subito dopo la registrazione).
2. Dopo la registrazione, se `users/{uid}.householdId` non esiste: schermata "Crea
   famiglia" / "Unisciti con un codice".
   - **Crea famiglia:** genera `households/{nuovoId}`, scrive `householdId` sul
     proprio `users/{uid}`, mostra il codice con pulsante "copia e manda al tuo
     ragazzo".
   - **Unisciti:** incolli il codice, l'app verifica che `households/{codice}`
     esista, scrive `householdId` sul proprio `users/{uid}`.
3. Da qui in poi l'app si comporta come oggi, ma legge/scrive Firestore invece di
   `localStorage`, con un listener in tempo reale (`onSnapshot`): se lui spunta un
   ingrediente, lo vedi sparire sul tuo schermo senza ricaricare.

### Migrazione dei dati esistenti

Al primo login, se `localStorage['dietacosi.v1']` contiene dati (probabile, visto che
l'app è già in uso), dopo la creazione/adesione all'household l'app chiede: "Vuoi
importare i dati che avevi salvato su questo dispositivo?" — se sì, li scrive una
tantum nel documento `stato/corrente` dell'household (solo se quel documento è ancora
vuoto, per non sovrascrivere dati che l'altra persona ha già iniziato a inserire).

### Il peso: cosa cambia per l'utente

Il selettore manuale "LEI / LUI" nella scheda Peso sparisce: quando salvi una misura,
viene automaticamente attribuita a te (l'utente loggato). Il grafico resta a due linee
come oggi — una per ciascun `uid` che ha misure nell'household — quindi vedete ancora
entrambi gli andamenti, semplicemente l'etichetta ora viene dal vostro nome vero
invece che da un pulsante da premere.

### Comportamento offline

Il SDK Firestore ha una cache locale integrata: se il telefono perde connessione, le
letture continuano a funzionare dall'ultima versione sincronizzata e le scritture si
mettono in coda e partono da sole al ritorno della rete. Non serve costruire logica di
offline a mano.

---

## File toccati

- `sorgenti/shell.html` — schermata di login/registrazione/collegamento famiglia
  (nuovo markup, mostrato/nascosto in base allo stato di auth); tag `<script
  type="module">` per inizializzare Firebase.
- `sorgenti/firebase-config.js` (nuovo, **non committato** — vedi nota sotto) — le
  chiavi del progetto Firebase dell'utente.
- `sorgenti/auth.js` (nuovo) — login, registrazione, crea/unisciti a household,
  gestione dello stato di autenticazione.
- `sorgenti/app.js` — `salva()`/`carica()` sostituiti da scrittura Firestore +
  listener `onSnapshot`; sezione Peso adattata a `uid` invece di `chi` manuale.
- `sorgenti/build.js` — aggiunta del nuovo segnaposto per `auth.js` e per la config
  Firebase.
- `CLAUDE.md` — documentare la nuova architettura (non più "tutto in localStorage").
- Console Firebase (fuori dal codice, lato utente): creazione progetto, attivazione
  Auth (Email/Password) e Firestore, pubblicazione delle regole di sicurezza sopra.

**Nota sulle chiavi Firebase:** sono chiavi pubbliche per design (il client le usa per
parlare con Firebase, la sicurezza vera è nelle regole Firestore, non nel nascondere
la chiave) — possono stare nel repository pubblico su GitHub senza problemi. Le tengo
comunque in un file separato (`firebase-config.js`) così è ovvio cosa incollare
quando l'utente crea il proprio progetto Firebase, invece di infilarle in mezzo al
resto del codice.

---

## Verifica

- Test manuale con due account reali (o due schede del browser, una in incognito):
  creare famiglia da un account, unirsi dall'altro, verificare che una modifica su un
  account appaia sull'altro senza ricaricare.
- Verifica esplicita delle regole di sicurezza: da un terzo account (non collegato a
  nessun household), tentare di leggere l'household della coppia e verificare che
  Firestore neghi l'accesso.
- `node sorgenti/test.js` continua a passare invariato: non tocca `PASTI`/`BASI`/`ING`,
  solo lo strato di persistenza.

---

## Fuori ambito (qui — arriva nei progetti successivi)

- Editing di ricette/pasti (Progetto 2).
- Dispensa con quantità e suggerimenti (Progetto 3).
- Pagina "pasti da provare" (Progetto 4).
- Recupero password, provider di login social, verifica email: non richiesti ora,
  aggiungibili in seguito senza cambiare lo schema dati.
