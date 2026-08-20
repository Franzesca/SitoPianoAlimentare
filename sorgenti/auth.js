/* ==========================================================================
   Autenticazione e household condiviso (Firebase)
   ========================================================================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, addDoc, collection,
  onSnapshot, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const fbApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

let UID = null;
let HOUSEHOLD_ID = null;
let MIO_NOME = '';
let _onPronto = null;
let _pronto = false;
function quandoPronto(cb){ _onPronto = cb; }
function segnalaPronto(){
  document.getElementById('gate').hidden = true;
  document.getElementById('app-shell').hidden = false;
  if (_pronto) return;
  _pronto = true;
  if (_onPronto) _onPronto();
}

function mostraGate(id){
  ['gate-carica','gate-login','gate-registrati','gate-famiglia','gate-codice'].forEach(g => {
    document.getElementById(g).hidden = (g !== id);
  });
  document.getElementById('gate').hidden = false;
  document.getElementById('app-shell').hidden = true;
}
function mostraErrore(id, msg){
  const el = document.getElementById(id);
  el.textContent = msg; el.hidden = false;
}
function erroreLeggibile(err){
  const c = (err && err.code) || '';
  if (c === 'auth/invalid-email') return 'Email non valida.';
  if (c === 'auth/email-already-in-use') return 'Questa email ha già un account: prova ad accedere.';
  if (c === 'auth/weak-password') return 'La password deve avere almeno 6 caratteri.';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'Email o password sbagliate.';
  if (c === 'auth/popup-blocked') return 'Il browser ha bloccato il popup: consenti i popup per questo sito e riprova.';
  if (c === 'auth/unauthorized-domain') return 'Questo indirizzo non è autorizzato per il login Google (serve http/https, non un file aperto direttamente, e il dominio va aggiunto su Firebase se non è già tra quelli autorizzati).';
  return 'Qualcosa non ha funzionato: ' + ((err && err.message) || err);
}

async function accediConGoogle(){
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch(err){
    const c = err && err.code;
    if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
    mostraErrore('li-errore', erroreLeggibile(err));
  }
}
document.getElementById('google-login').addEventListener('click', accediConGoogle);
document.getElementById('google-registrati').addEventListener('click', accediConGoogle);

async function dopoLogin(user){
  UID = user.uid;
  let s = await getDoc(doc(db, 'users', UID));
  if (!s.exists()){
    await setDoc(doc(db, 'users', UID), { email: user.email || '', nome: user.displayName || '', householdId: null });
    s = await getDoc(doc(db, 'users', UID));
  }
  const dati = s.data();
  MIO_NOME = dati.nome || '';
  console.log('DEBUG dopoLogin: UID=', UID, '| dati.householdId=', JSON.stringify(dati.householdId));
  if (dati.householdId){
    HOUSEHOLD_ID = dati.householdId;
    segnalaPronto();
  } else {
    mostraGate('gate-famiglia');
  }
}

onAuthStateChanged(auth, user => { if (user) dopoLogin(user); else mostraGate('gate-login'); });

document.getElementById('gate-login').addEventListener('submit', async e => {
  e.preventDefault();
  document.getElementById('li-errore').hidden = true;
  try {
    await signInWithEmailAndPassword(auth, document.getElementById('li-email').value.trim(), document.getElementById('li-pw').value);
  } catch(err){ mostraErrore('li-errore', erroreLeggibile(err)); }
});

document.getElementById('gate-registrati').addEventListener('submit', async e => {
  e.preventDefault();
  document.getElementById('re-errore').hidden = true;
  const nome = document.getElementById('re-nome').value.trim();
  const email = document.getElementById('re-email').value.trim();
  const pw = document.getElementById('re-pw').value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await setDoc(doc(db, 'users', cred.user.uid), { email, nome, householdId: null });
  } catch(err){ mostraErrore('re-errore', erroreLeggibile(err)); }
});

document.getElementById('vai-registrati').addEventListener('click', e => { e.preventDefault(); mostraGate('gate-registrati'); });
document.getElementById('vai-login').addEventListener('click', e => { e.preventDefault(); mostraGate('gate-login'); });

document.getElementById('crea-famiglia').addEventListener('click', async () => {
  const ref = doc(collection(db, 'households'));
  await setDoc(ref, { creatoDa: UID, creatoIl: Date.now() });
  await setDoc(doc(db, 'users', UID), { householdId: ref.id }, { merge: true });
  HOUSEHOLD_ID = ref.id;
  console.log('DEBUG crea-famiglia: UID=', UID, '| nuovo HOUSEHOLD_ID=', HOUSEHOLD_ID);
  document.getElementById('codice-testo').textContent = ref.id;
  mostraGate('gate-codice');
});

document.getElementById('unisci-famiglia').addEventListener('click', async () => {
  document.getElementById('fa-errore').hidden = true;
  const codice = document.getElementById('fa-codice').value.trim();
  if (!codice) return;
  try {
    const s = await getDoc(doc(db, 'households', codice));
    if (!s.exists()) throw new Error('Codice non valido: controlla di averlo copiato tutto.');
    await setDoc(doc(db, 'users', UID), { householdId: codice }, { merge: true });
    HOUSEHOLD_ID = codice;
    segnalaPronto();
  } catch(err){ mostraErrore('fa-errore', err.message || erroreLeggibile(err)); }
});

document.getElementById('copia-codice').addEventListener('click', () => {
  const codice = document.getElementById('codice-testo').textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(codice) : Promise.reject()).catch(()=>{});
});
document.getElementById('continua-app').addEventListener('click', segnalaPronto);

document.getElementById('esci').addEventListener('click', () => { signOut(auth); location.reload(); });
