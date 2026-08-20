/* ==========================================================================
   DietaCosi — modello dati
   Fonti: piano-pasti-definitivo.md  +  preparazione-domenicale.md
   Nessun valore inventato: le grammature e le stime kcal/proteine sono
   riportate dai documenti. Unica eccezione dichiarata: il pranzo di venerdì
   (ex "Sbrodolino", segnaposto) sostituito con un pasto basico — vedi id
   'ven-pra'.
   ========================================================================== */

/* ---------- 1. Registro ingredienti: reparto + unità + resa per pezzo ----- */
// r = reparto · u = unità ('g' | 'pz') · pz = grammi per pezzo (per convertire)
// nc = non si compra (acqua, brodo) · lei = finitura solo per lei
const ING = {
  // — Carne e pesce
  'Sovracosce di pollo disossate senza pelle': {r:'carne', u:'g'},
  'Petto di pollo':                            {r:'carne', u:'g'},
  'Petto di tacchino':                         {r:'carne', u:'g'},
  'Macinato di tacchino':                      {r:'carne', u:'g'},
  'Manzo magro per ragù':                      {r:'carne', u:'g'},
  'Salsiccia di pollo o tacchino':             {r:'carne', u:'g'},
  'Gamberi sgusciati':                         {r:'carne', u:'g'},

  // — Uova e latticini
  'Uova':                       {r:'latticini', u:'pz', pz:55},
  'Albumi':                     {r:'latticini', u:'pz', pz:33, nota:'ricavabili dalle uova, se non compri gli albumi liquidi'},
  'Skyr 0%':                    {r:'latticini', u:'g'},
  'Yogurt greco 0%':            {r:'latticini', u:'g'},
  'Ricotta magra':              {r:'latticini', u:'g'},
  'Feta':                       {r:'latticini', u:'g'},
  'Formaggio magro grattugiato':{r:'latticini', u:'g'},
  'Grana grattugiato':          {r:'latticini', u:'g'},

  // — Legumi, cereali, farine
  'Ceci secchi':                {r:'secchi', u:'g'},
  'Fagioli neri secchi':        {r:'secchi', u:'g'},
  'Lenticchie verdi secche':    {r:'secchi', u:'g'},
  'Lenticchie rosse secche':    {r:'secchi', u:'g'},
  'Riso basmati':               {r:'secchi', u:'g'},
  'Riso jasmine':               {r:'secchi', u:'g'},
  'Pasta secca integrale':      {r:'secchi', u:'g'},
  'Bulgur':                     {r:'secchi', u:'g'},
  'Farina per polenta integrale':{r:'secchi', u:'g'},
  'Farina di ceci':             {r:'secchi', u:'g'},
  'Pangrattato':                {r:'secchi', u:'g'},

  // — Pane e tortillas
  'Pane integrale':             {r:'pane', u:'g'},
  'Tortilla integrale media':   {r:'pane', u:'pz', pz:50},
  'Panino piccolo':             {r:'pane', u:'pz', pz:65},

  // — Ortofrutta
  'Cipolle dorate':             {r:'orto', u:'g'},
  'Cipolla rossa':              {r:'orto', u:'g', lei:true},
  'Cipollotto':                 {r:'orto', u:'g', lei:true},
  'Carote':                     {r:'orto', u:'g'},
  'Sedano':                     {r:'orto', u:'g'},
  'Peperoni rossi':             {r:'orto', u:'g'},
  'Aglio':                      {r:'orto', u:'g'},
  'Zenzero fresco':             {r:'orto', u:'g'},
  'Zucca':                      {r:'orto', u:'g'},
  'Spinaci freschi':            {r:'orto', u:'g'},
  'Limoni':                     {r:'orto', u:'g', pz:40, comeSucco:true},
  'Lime':                       {r:'orto', u:'g', pz:30, comeSucco:true},
  'Pomodoro fresco':            {r:'orto', u:'g', lei:true},
  'Pomodorini':                 {r:'orto', u:'g', lei:true},
  'Cetriolo':                   {r:'orto', u:'g', lei:true},
  'Insalata mista':             {r:'orto', u:'g', lei:true},
  'Coriandolo fresco':          {r:'orto', u:'g', lei:true},
  'Prezzemolo fresco':          {r:'orto', u:'g'},
  'Menta fresca':               {r:'orto', u:'g', lei:true},
  'Basilico thai':              {r:'orto', u:'g'},
  'Rosmarino':                  {r:'orto', u:'pz', pz:5},

  // — Scatolame e conserve
  'Pomodori pelati':            {r:'scatolame', u:'g'},
  'Passata di pomodoro':        {r:'scatolame', u:'g'},
  'Concentrato di pomodoro':    {r:'scatolame', u:'g'},
  'Latte di cocco light':       {r:'scatolame', u:'g'},
  'Kimchi':                     {r:'scatolame', u:'g', lei:true},

  // — Dispensa
  'Olio EVO':                   {r:'dispensa', u:'g'},
  'Olio di sesamo':             {r:'dispensa', u:'g'},
  'Tahina':                     {r:'dispensa', u:'g'},
  'Salsa di soia':              {r:'dispensa', u:'g'},
  'Gochujang':                  {r:'dispensa', u:'g'},
  'Pasta di curry rosso thai':  {r:'dispensa', u:'g'},
  'Harissa':                    {r:'dispensa', u:'g'},
  'Senape':                     {r:'dispensa', u:'g'},
  'Miele':                      {r:'dispensa', u:'g'},
  'Aceto di riso':              {r:'dispensa', u:'g'},
  'Vino rosso':                 {r:'dispensa', u:'g'},
  'Cacao amaro':                {r:'dispensa', u:'g'},
  'Burro d\'arachidi 100%':     {r:'dispensa', u:'g'},
  'Mandorle':                   {r:'dispensa', u:'g'},
  'Noci':                       {r:'dispensa', u:'g'},
  'Semi di zucca':              {r:'dispensa', u:'g'},
  'Semi di lino':               {r:'dispensa', u:'g'},
  'Semi di sesamo':             {r:'dispensa', u:'g'},
  'Bicarbonato':                {r:'dispensa', u:'g'},
  'Sale':                       {r:'dispensa', u:'g'},

  // — Spezie ed erbe secche
  'Cumino':                     {r:'spezie', u:'g'},
  'Cumino in semi':             {r:'spezie', u:'g'},
  'Paprika affumicata':         {r:'spezie', u:'g'},
  'Curcuma':                    {r:'spezie', u:'g'},
  'Garam masala':               {r:'spezie', u:'g'},
  'Coriandolo in polvere':      {r:'spezie', u:'g'},
  'Cannella':                   {r:'spezie', u:'g'},
  'Peperoncino':                {r:'spezie', u:'g'},
  'Origano secco':              {r:'spezie', u:'g'},
  'Menta secca':                {r:'spezie', u:'g'},
  'Aglio in polvere':           {r:'spezie', u:'g'},
  'Pepe nero':                  {r:'spezie', u:'g'},
  'Alloro':                     {r:'spezie', u:'pz', pz:0.2},

  // — Non si compra
  'Acqua':                      {r:'nc', u:'g', nc:true},
  'Brodo (o acqua)':            {r:'nc', u:'g', nc:true, nota:'acqua + dado se non hai brodo fatto'},
};

const REPARTI = [
  ['carne',     'Banco carne e pesce'],
  ['latticini', 'Uova e latticini'],
  ['secchi',    'Legumi, cereali e farine'],
  ['pane',      'Pane e tortillas'],
  ['orto',      'Ortofrutta'],
  ['scatolame', 'Scatolame e conserve'],
  ['dispensa',  'Dispensa'],
  ['spezie',    'Spezie ed erbe secche'],
  ['nc',        'Non serve comprarlo'],
];

/* ---------- 2. Le basi domenicali ---------------------------------------
   resa = grammi prodotti · ing = ingredienti per l'intera resa (LORDI dove
   il documento fornisce il lordo da comprare). Le basi possono contenere
   altre basi: l'esplosione è ricorsiva.
   ------------------------------------------------------------------------ */
const BASI = [
{ id:'soffritto', nome:'soffritto lungo frullato', resa:3300, kcal100:87,
  tempoAtt:25, tempoTot:95, ordine:1,
  conserva:['5 giorni','3 mesi'],
  nota:'La preparazione più importante del piano: 90 minuti di cottura rendono le verdure compatibili con il vincolo di lui. Frulla finché non è perfettamente liscia.',
  proc:[
    'Trita tutto grossolanamente col robot da cucina, a impulsi, non a purea.',
    'Pentola larga, olio, tutte le verdure: coperchio, fuoco basso, 45 minuti. Mescola ogni 15. Devono collassare, non rosolare.',
    'Scoperchia, unisci pelati e concentrato. Altri 45 minuti a fuoco basso, scoperto: è qui che perde acqua.',
    'Frulla a immersione fino a crema perfettamente liscia.',
    'Dividi subito: ~1.800 g in frigo, ~1.500 g in freezer in porzioni da 250 g.'],
  timer:[['Verdure coperte',45],['Con i pelati',45]],
  ing:[['Cipolle dorate',2500],['Carote',1400],['Sedano',700],['Peperoni rossi',1150],
       ['Aglio',45],['Olio EVO',90],['Pomodori pelati',1200],['Concentrato di pomodoro',60],
       ['Sale',26]] },

{ id:'ceci', nome:'Ceci cotti', resa:1130, ordine:2, tempoAtt:5, tempoTot:40,
  conserva:['4 giorni','3 mesi'],
  nota:'Ammolla 600 g di ceci secchi in tutto: 450 g vanno cotti, 150 g restano crudi e ammollati per i falafel. Con i ceci cotti l\'impasto dei falafel non lega.',
  proc:['Ammollo 12 ore con il bicarbonato.','Scola e separa: 450 g in pentola a pressione 40 minuti.','Sala a fine cottura.'],
  timer:[['Pentola a pressione',40]],
  ing:[['Ceci secchi',450],['Bicarbonato',3],['Alloro',2],['Sale',8]] },

{ id:'fagioli', nome:'Fagioli neri cotti', resa:1000, ordine:3, tempoAtt:5, tempoTot:35,
  conserva:['4 giorni','3 mesi'],
  proc:['Ammollo 12 ore.','Pentola a pressione 35 minuti.','Sala a fine cottura.'],
  timer:[['Pentola a pressione',35]],
  ing:[['Fagioli neri secchi',400],['Alloro',2],['Sale',7]] },

{ id:'lenticchie', nome:'Lenticchie verdi cotte', resa:400, ordine:4, tempoAtt:3, tempoTot:25,
  conserva:['4 giorni','3 mesi'],
  proc:['25 minuti in acqua non salata.'],
  timer:[['Cottura',25]],
  ing:[['Lenticchie verdi secche',160]] },

{ id:'pulled', nome:'Pulled chicken', resa:890, ordine:5, tempoAtt:10, tempoTot:130,
  conserva:['3 giorni','2 mesi'],
  nota:'Non condirlo adesso. Va in tre direzioni diverse durante la settimana: se lo insaporisci ora, ti ritrovi lo stesso piatto tre volte. Resa dopo cottura ~68% del crudo.',
  proc:['Massaggia le sovracosce con le spezie e il sale.','Forno 150 °C, 2 ore, teglia coperta con alluminio, con il brodo sul fondo.','Sfilaccia con due forchette.'],
  timer:[['Forno 150 °C',120]],
  ing:[['Sovracosce di pollo disossate senza pelle',1300],['Cumino',10],['Paprika affumicata',8],
       ['Aglio in polvere',6],['Sale',14],['Pepe nero',3],['Brodo (o acqua)',150]] },

{ id:'chili', nome:'Chili di ceci e fagioli neri', resa:1400, ordine:6, tempoAtt:8, tempoTot:20,
  conserva:['4 giorni','3 mesi'],
  nota:'Quello che avanza va in freezer: è il pasto di riserva per la sera in cui non avete voglia di niente.',
  proc:['Tutto in pentola, 20 minuti a fuoco medio-basso.'],
  timer:[['Cottura',20]],
  ing:[['@soffritto',600],['@ceci',350],['@fagioli',350],['Passata di pomodoro',200],
       ['Brodo (o acqua)',150],['Cumino',8],['Paprika affumicata',6],['Cacao amaro',5],
       ['Cannella',1],['Peperoncino',2],['Sale',6]] },

{ id:'ragu', nome:'Ragù al coltello', resa:800, ordine:7, tempoAtt:15, tempoTot:100,
  conserva:['3 giorni','3 mesi'],
  proc:['Rosola la carne a fuoco alto e in due riprese: tutta insieme bolle invece di rosolare.',
        'Sfuma col vino rosso.','Unisci soffritto, passata e alloro. Fuoco bassissimo, 90 minuti.'],
  timer:[['Fuoco bassissimo',90]],
  ing:[['Manzo magro per ragù',500],['@soffritto',400],['Passata di pomodoro',200],
       ['Vino rosso',150],['Olio EVO',10],['Alloro',2],['Sale',6]] },

{ id:'vellutata', nome:'Vellutata di lenticchie rosse e zucca', resa:1500, ordine:8, tempoAtt:10, tempoTot:35,
  conserva:['4 giorni','3 mesi'],
  proc:['Tutto in pentola, 30 minuti.','Frulla.'],
  timer:[['Cottura',30]],
  ing:[['Lenticchie rosse secche',200],['Zucca',1100],['Cipolle dorate',100],['Zenzero fresco',15],
       ['Brodo (o acqua)',1200],['Olio EVO',15],['Curcuma',3],['Sale',9]] },

{ id:'salsayogurt', nome:'Salsa yogurt, aglio e menta secca', resa:560, ordine:9, tempoAtt:5, tempoTot:5,
  conserva:['4 giorni','—'],
  nota:'Menta secca, non fresca. Essiccata ha un profilo più resinoso ed è quella che si usa per questa salsa — e risolve il vincolo di lui, che con le foglie fresche non ci va.',
  proc:['Mescola tutto. Riposo in frigo almeno un\'ora.'],
  ing:[['Yogurt greco 0%',500],['Aglio',6],['Menta secca',4],['Limoni',15],['Sale',4],['Olio EVO',10]] },

{ id:'cipolle', nome:'Cipolle caramellate frullate', resa:250, ordine:10, tempoAtt:8, tempoTot:45,
  conserva:['5 giorni','2 mesi'],
  nota:'È il condimento dell\'hot dog e il sostituto strutturale di qualsiasi cipolla cruda per lui.',
  proc:['Fuoco basso 40 minuti finché non sono brune e dolci.','Frulla.'],
  timer:[['Fuoco basso',40]],
  ing:[['Cipolle dorate',500],['Olio EVO',15],['Aceto di riso',20],['Acqua',100],['Sale',4]] },

{ id:'salsapeperoni', nome:'Salsa di peperoni arrostiti', resa:250, ordine:11, tempoAtt:10, tempoTot:40,
  conserva:['5 giorni','2 mesi'],
  proc:['Peperoni in forno 200 °C per 30 minuti.','Pelali.','Frulla con il resto.'],
  timer:[['Forno 200 °C',30]],
  ing:[['Peperoni rossi',400],['Aglio',5],['Olio EVO',15],['Aceto di riso',10],
       ['Paprika affumicata',2],['Sale',3]] },

{ id:'hummus', nome:'Hummus', resa:420, ordine:12, tempoAtt:10, tempoTot:10,
  conserva:['5 giorni','2 mesi'],
  proc:['Frulla tutto a lungo, aggiungendo l\'acqua di cottura dei ceci poco per volta.'],
  ing:[['@ceci',250],['Tahina',50],['Limoni',35],['Acqua',60],['Olio EVO',15],
       ['Aglio',5],['Cumino',3],['Sale',4]] },

{ id:'falafel', nome:'Impasto falafel', resa:600, pezzi:10, ordine:13, tempoAtt:15, tempoTot:75,
  conserva:['3 giorni (da crudo)','—'],
  nota:'Ceci ammollati e crudi, mai cotti: con quelli cotti l\'impasto non lega e si disfa in forno. I falafel si infornano al momento, non la domenica.',
  proc:['Frulla a impulsi fino a granuloso, non a crema.','Riposo in frigo 1 ora.','Forma le palline da 55-60 g.',
        'Al momento: forno 200 °C per 20-25 minuti, girati a metà, spennellati d\'olio.'],
  timer:[['Riposo in frigo',60],['Forno 200 °C',22]],
  ing:[['Ceci secchi',150],['Cipolle dorate',50],['Aglio',8],['Prezzemolo fresco',20],
       ['Farina di ceci',25],['Cumino',5],['Coriandolo in polvere',4],['Bicarbonato',2],
       ['Sale',6],['Olio EVO',15]] },

{ id:'riso', nome:'Riso basmati cotto', resa:690, ordine:14, tempoAtt:3, tempoTot:15,
  conserva:['3 giorni','—'],
  nota:'Solo 250 g di crudo, non di più: il riso cotto si conserva massimo 3 giorni e va raffreddato in fretta, allargato su un vassoio. Da giovedì in poi cuocilo fresco, sono 15 minuti.',
  proc:['Riso, acqua e sale, coperchio, 12 minuti.','Raffredda in fretta allargandolo su un vassoio.'],
  timer:[['Cottura',12]],
  ing:[['Riso basmati',250],['Acqua',440],['Sale',4]] },
];

/* ---------- 3. I pasti ---------------------------------------------------
   ing: {b:'idBase'|n:'Nome ingrediente', q, soloLei?, soloLui?, qb?}
   q = quantità per persona (entrambi mangiano la stessa cosa).
   soloLei = finitura a crudo che resta solo nel piatto di lei.
   soloLui = equivalente cotto/frullato che resta solo nel piatto di lui.
   qb: true = quanto basta (non pesa sulla lista)
   ------------------------------------------------------------------------ */
const PASTI = [
/* ============================ LUNEDÌ ============================ */
{ id:'lun-col', nome:'Uova alla pizzaiola', tipo:'colazione', g:0,
  tempo:10, difficolta:'facile',
  desc:'Le uova affogate nel soffritto ridotto, con origano e peperoncino. Il pane serve a raccogliere, non a riempire.',
  val:[400,25],
  ing:[{b:'soffritto',q:120},{n:'Uova',q:2},{n:'Albumi',q:2},
       {n:'Pane integrale',q:20},{n:'Olio EVO',q:4},
       {n:'Origano secco',q:1},{n:'Peperoncino',q:0,qb:true}],
  proc:'Scalda il soffritto in padella con l\'olio e l\'origano, 3 minuti, finché non si asciuga e comincia a sfrigolare ai bordi. Sbatti gli albumi con le uova intere e versali sopra. Non mescolare: copri e lascia rapprendere 4-5 minuti a fuoco medio-basso. Peperoncino sopra, pane tostato a parte.' },

{ id:'lun-pra', nome:'Chili di ceci e fagioli neri con riso', tipo:'pranzo', g:0,
  tempo:8, difficolta:'facile',
  desc:'Dalla base. Si scalda e si finisce, 6 minuti in tutto.',
  val:[460,20],
  ing:[{b:'chili',q:280},{b:'riso',q:100},
       {n:'Yogurt greco 0%',q:40},{n:'Lime',q:10},
       {n:'Cipolla rossa',q:20,soloLei:true},{n:'Coriandolo fresco',q:5,soloLei:true}],
  proc:'Scalda il chili in padella, non nel microonde: ci vogliono 5 minuti ma si asciuga e si concentra invece di diventare acquoso. Riso a fianco, non sotto.',
  vincolo:{lei:'Cipolla rossa cruda a fettine sottilissime, coriandolo spezzettato a mano, lime spremuto sopra alla fine.',
           lui:'Niente cipolla e niente coriandolo. Il lime va spremuto dentro il chili durante gli ultimi 2 minuti di cottura — la nota acida arriva lo stesso, ma cotta. Yogurt e una spolverata di peperoncino sopra.'} },

{ id:'lun-cen', nome:'Curry di sovracosce con spinaci, e vellutata a fianco', tipo:'cena', g:0,
  tempo:45, difficolta:'media',
  desc:'L\'unico pasto della settimana con le sovracosce crude. Brasate, non saltate.',
  val:[515,43],
  ing:[{b:'soffritto',q:100},{b:'vellutata',q:150},
       {n:'Sovracosce di pollo disossate senza pelle',q:150},
       {n:'Spinaci freschi',q:150},{n:'Latte di cocco light',q:50},
       {n:'Olio EVO',q:4},{n:'Zenzero fresco',q:5},{n:'Aglio',q:5},
       {n:'Garam masala',q:3},{n:'Curcuma',q:2}],
  proc:'Taglia le sovracosce in pezzi da 4 cm. Rosolale nell\'olio a fuoco alto 4 minuti, tirale fuori. Nella stessa padella: zenzero, aglio, spezie, 40 secondi finché non profumano. Unisci soffritto e latte di cocco, rimetti il pollo, coperchio, fuoco basso, 35 minuti. Gli spinaci entrano negli ultimi minuti.',
  vincolo:{lei:'I suoi 150 g di spinaci vanno appassiti 40 secondi a fine cottura, restano foglia.',
           lui:'I suoi 150 g vanno cotti a parte 15 minuti e frullati dentro la salsa prima di rimettere il pollo. La salsa diventa verde scura e cremosa. Sono gli stessi spinaci, cambia solo quando entrano e in che forma.'} },

{ id:'lun-spu', nome:'Skyr, cacao e mandorle', tipo:'spuntino', g:0,
  tempo:2, difficolta:'facile',
  val:[155,21],
  ing:[{n:'Skyr 0%',q:170},{n:'Mandorle',q:10},
       {n:'Cacao amaro',q:4},{n:'Cannella',q:1}] },

/* ============================ MARTEDÌ =========================== */
{ id:'mar-col', nome:'Breakfast burrito', tipo:'colazione', g:1,
  tempo:12, difficolta:'media',
  desc:'Si arrotolano stretti e si scaldano in padella asciutta finché non sigillano.',
  val:[420,27],
  ing:[{b:'fagioli',q:70},
       {n:'Tortilla integrale media',q:1},
       {n:'Uova',q:2},{n:'Albumi',q:1},
       {n:'Formaggio magro grattugiato',q:20},{n:'Passata di pomodoro',q:40},
       {n:'Cumino',q:2},{n:'Olio EVO',q:3},
       {n:'Pomodoro fresco',q:40,soloLei:true},{n:'Coriandolo fresco',q:5,soloLei:true}],
  proc:'Schiaccia i fagioli con la forchetta, cumino e sale, scaldali 2 minuti. Strapazza le uova morbide, toglile dal fuoco quando sono ancora lucide. Farcisci la tortilla: fagioli, uova, formaggio, salsa. Arrotola stretto e rimetti in padella asciutta 90 secondi per lato, la chiusura sotto.',
  vincolo:{lei:'Salsa cruda — 40 g di passata con pomodoro fresco a dadini e coriandolo.',
           lui:'Stessa passata cotta in padella 8 minuti con un pizzico di cumino, poi frullata liscia.'} },

{ id:'mar-pra', nome:'Pasta al ragù fatto al coltello', tipo:'pranzo', g:1,
  tempo:12, difficolta:'facile',
  val:[465,32],
  ing:[{b:'ragu',q:150},{n:'Pasta secca integrale',q:60},
       {n:'Grana grattugiato',q:8}],
  proc:'Scalda il ragù in padella larga. Scola la pasta 2 minuti prima del tempo e mantecala nel ragù con due cucchiai di acqua di cottura, 60 secondi a fuoco vivo. Grana fuori dal fuoco.' },

{ id:'mar-cen', nome:'Harira e tacchino alla piastra', tipo:'cena', g:1,
  tempo:40, difficolta:'media',
  desc:'Zuppa marocchina. Già conforme al vincolo per costruzione: cuoce 40 minuti e si disfa tutto.',
  val:[470,44],
  ing:[{b:'soffritto',q:120},{b:'ceci',q:100},
       {n:'Lenticchie rosse secche',q:40},{n:'Petto di tacchino',q:130},
       {n:'Passata di pomodoro',q:80},{n:'Brodo (o acqua)',q:250},
       {n:'Pane integrale',q:25},{n:'Zenzero fresco',q:4},
       {n:'Curcuma',q:2},{n:'Cannella',q:1},
       {n:'Limoni',q:10},{n:'Olio EVO',q:4}],
  proc:'soffritto, spezie e olio in pentola, 2 minuti. Unisci lenticchie rosse, ceci, passata e brodo. 35 minuti a fuoco basso: le lenticchie rosse devono sparire e addensare la zuppa. Limone alla fine, a fuoco spento. Il tacchino a fette spesse, piastra rovente, 3 minuti per lato, tagliato a strisce sopra la zuppa.',
  nota:'Già conforme al vincolo. Nessuna variante.' },

{ id:'mar-spu', nome:'Ricotta, semi di zucca e miele', tipo:'spuntino', g:1,
  tempo:2, difficolta:'facile',
  val:[220,17],
  ing:[{n:'Ricotta magra',q:130},{n:'Semi di zucca',q:8},{n:'Miele',q:5}] },

/* =========================== MERCOLEDÌ ========================== */
{ id:'mer-col', nome:'Anda bhurji', tipo:'colazione', g:2,
  tempo:10, difficolta:'facile',
  desc:'Uova strapazzate indiane. Il soffritto fa da base, le spezie tostate a secco fanno il resto.',
  val:[395,25],
  ing:[{b:'soffritto',q:100},{n:'Uova',q:2},{n:'Albumi',q:2},
       {n:'Pane integrale',q:25},{n:'Olio EVO',q:4},
       {n:'Cumino in semi',q:2},{n:'Curcuma',q:2},
       {n:'Coriandolo in polvere',q:2},{n:'Zenzero fresco',q:4}],
  proc:'Olio caldo, cumino in semi finché non scoppietta (30 secondi, è il passaggio che fa il piatto), poi zenzero, curcuma, coriandolo. Unisci il soffritto, 2 minuti. Versa le uova sbattute e mescola continuamente a fuoco basso finché non sono cremose — non asciutte.' },

{ id:'mer-pra', nome:'Wrap di falafel', tipo:'pranzo', g:2,
  tempo:25, difficolta:'media',
  desc:'I falafel si infornano adesso: domenica hai preparato solo l\'impasto.',
  val:[485,22],
  ing:[{b:'falafel',q:230},{b:'hummus',q:40},
       {b:'salsapeperoni',q:40,soloLui:true},
       {n:'Tortilla integrale media',q:1},
       {n:'Tahina',q:8},{n:'Limoni',q:10},
       {n:'Pomodoro fresco',q:60,soloLei:true},{n:'Cetriolo',q:50,soloLei:true},{n:'Menta fresca',q:5,soloLei:true}],
  proc:'Falafel in forno 200 °C per 22 minuti, girati a metà, su carta forno e spennellati d\'olio. Nel frattempo diluisci la tahina col limone e due cucchiai d\'acqua fredda: si stringe prima di ammorbidirsi, continua a mescolare. Scalda la tortilla 20 secondi per lato.',
  vincolo:{lei:'Hummus, falafel (4 pezzi), pomodoro a dadini, cetriolo, menta, tahina.',
           lui:'Hummus, falafel (4 pezzi), salsa di peperoni arrostiti al posto delle verdure crude, tahina.'} },

{ id:'mer-cen', nome:'Riso e pulled chicken gochujang', tipo:'cena', g:2,
  tempo:8, difficolta:'facile',
  val:[490,44],
  ing:[{b:'pulled',q:150},{b:'riso',q:130},
       {n:'Gochujang',q:25},{n:'Salsa di soia',q:10},
       {n:'Aceto di riso',q:8},{n:'Miele',q:5},{n:'Aglio',q:5},
       {n:'Olio di sesamo',q:3},{n:'Semi di sesamo',q:3},
       {n:'Cipollotto',q:15,soloLei:true},{n:'Kimchi',q:50,soloLei:true},
       {n:'Cipolle dorate',q:40,soloLui:true}],
  proc:'Mescola gochujang, soia, aceto, miele e aglio in una ciotola. Scalda il pulled chicken in padella rovente senza girarlo per 2 minuti, così alcune parti si abbrustoliscono. Versa la salsa, fai caramellare 90 secondi. Sesamo alla fine.',
  vincolo:{lei:'Cipollotto crudo a rondelle e kimchi a parte.',
           lui:'Niente kimchi — è fermentato ma crudo, fuori vincolo. Al suo posto 40 g di cipolla stufata 20 minuti con aceto di riso e peperoncino. Stessa funzione acida e piccante, consistenza morbida.'} },

{ id:'mer-spu', nome:'Yogurt greco e burro d\'arachidi', tipo:'spuntino', g:2,
  tempo:2, difficolta:'facile',
  val:[145,19],
  ing:[{n:'Yogurt greco 0%',q:170},{n:'Burro d\'arachidi 100%',q:8}] },

/* ============================ GIOVEDÌ =========================== */
{ id:'gio-col', nome:'Quesadilla di fagioli e pulled chicken', tipo:'colazione', g:3,
  tempo:12, difficolta:'media',
  val:[395,30],
  ing:[{b:'fagioli',q:60},{b:'pulled',q:50},
       {n:'Tortilla integrale media',q:1},
       {n:'Formaggio magro grattugiato',q:25},
       {n:'Cumino',q:2},{n:'Paprika affumicata',q:1}],
  proc:'Schiaccia i fagioli con cumino e paprika. Spalma su metà tortilla, sopra il pulled chicken e il formaggio, piega a mezzaluna. Padella asciutta, fuoco medio, 3 minuti per lato con un peso sopra (un\'altra padella va bene): serve la pressione, altrimenti non sigilla e si sfalda al taglio. Aspetta 2 minuti prima di tagliarla.' },

{ id:'gio-pra', nome:'Lenticchie e polenta', tipo:'pranzo', g:3,
  tempo:40, difficolta:'media',
  desc:'Già conforme al vincolo. Nessuna variante.',
  val:[460,22],
  ing:[{b:'soffritto',q:100},{b:'lenticchie',q:180},
       {n:'Farina per polenta integrale',q:45},{n:'Acqua',q:200},
       {n:'Olio EVO',q:6},{n:'Rosmarino',q:1},{n:'Alloro',q:1},
       {n:'Passata di pomodoro',q:40}],
  proc:'Polenta: acqua salata a bollore, farina a pioggia mescolando, poi 40 minuti a fuoco basso — quella istantanea è un\'altra cosa. Intanto scalda soffritto, olio, rosmarino e alloro, unisci lenticchie e passata, 12 minuti a fuoco basso perché si insaporiscano. Devono restare umide, non asciutte.',
  nota:'Già conforme al vincolo. Nessuna variante.' },

{ id:'gio-cen', nome:'Kofta di tacchino in salsa harissa, con bulgur', tipo:'cena', g:3,
  tempo:40, difficolta:'media',
  val:[500,44],
  ing:[{b:'soffritto',q:120},{b:'salsayogurt',q:50},
       {n:'Macinato di tacchino',q:150},{n:'Bulgur',q:45},
       {n:'Harissa',q:10},{n:'Cumino',q:3},{n:'Menta secca',q:2},
       {n:'Aglio',q:5},{n:'Pangrattato',q:10},{n:'Olio EVO',q:4},
       {n:'Prezzemolo fresco',q:5,soloLei:true}],
  proc:'Impasta il macinato con cumino, menta secca, aglio, pangrattato e sale. Lascia riposare 20 minuti in frigo o le polpette si sfaldano. Forma cilindri allungati, rosolali nell\'olio 5 minuti girandoli. Aggiungi soffritto e harissa, coperchio, 15 minuti a fuoco basso. Bulgur: coprilo con acqua bollente pari al doppio del peso, coperchio, 15 minuti fuori dal fuoco.',
  vincolo:{lei:'Salsa yogurt con prezzemolo fresco tritato sopra.',
           lui:'Salsa yogurt liscia — è già fatta con menta secca, quindi va bene com\'è dal contenitore.'} },

{ id:'gio-spu', nome:'Skyr, cacao e noci', tipo:'spuntino', g:3,
  tempo:2, difficolta:'facile',
  val:[150,20],
  ing:[{n:'Skyr 0%',q:170},{n:'Noci',q:8},{n:'Cacao amaro',q:4}] },

/* ============================ VENERDÌ =========================== */
{ id:'ven-col', nome:'Shakshuka', tipo:'colazione', g:4,
  tempo:15, difficolta:'media',
  val:[410,22],
  ing:[{b:'soffritto',q:150},{n:'Passata di pomodoro',q:60},
       {n:'Uova',q:2},{n:'Feta',q:20},{n:'Pane integrale',q:25},
       {n:'Olio EVO',q:4},{n:'Cumino',q:2},{n:'Paprika affumicata',q:2}],
  proc:'Olio, cumino e paprika 30 secondi. Unisci soffritto e passata, riduci 6-8 minuti finché non è densa: se è liquida le uova affondano. Scava gli incavi col dorso del cucchiaio, rompici dentro le uova, coperchio 5 minuti — l\'albume rappreso, il tuorlo ancora liquido. Feta sbriciolata sopra a fuoco spento.' },

{ id:'ven-pra', nome:'Pasta al pomodoro con pollo sfilacciato', tipo:'pranzo', g:4, nuovo:true,
  tempo:15, difficolta:'facile',
  desc:'Sostituisce il segnaposto "Sbrodolino". Il pasto più basico della settimana: pasta, sugo, pollo. Conforme al vincolo per costruzione — è tutto cotto e frullato.',
  val:[520,42],
  ing:[{b:'soffritto',q:120},{b:'pulled',q:120},
       {n:'Pasta secca integrale',q:50},{n:'Passata di pomodoro',q:50},
       {n:'Grana grattugiato',q:8},{n:'Peperoncino',q:0,qb:true}],
  proc:'Scalda soffritto e passata in padella larga, 8 minuti, finché non stringe. Unisci il pulled chicken e lascialo insaporire 5 minuti: si ammorbidisce e prende il sugo. Scola la pasta 2 minuti prima, mantecala nel sugo con un cucchiaio di acqua di cottura. Grana fuori dal fuoco.',
  nota:'Attenzione: questi valori sono una mia stima, non presa dai documenti. Sono ~40 kcal sopra il segnaposto che sostituisce, quindi il pranzo resta leggermente sopra target — la leva più semplice è togliere 10 g di pasta.' },

{ id:'ven-cen', nome:'Chana saag con petto di pollo', tipo:'cena', g:4,
  tempo:35, difficolta:'media',
  desc:'Curry di ceci e spinaci. Già conforme al vincolo: gli spinaci finiscono in crema per entrambi.',
  val:[545,42],
  ing:[{b:'soffritto',q:120},{b:'ceci',q:180},
       {n:'Petto di pollo',q:100},{n:'Spinaci freschi',q:250},
       {n:'Riso basmati',q:40},{n:'Latte di cocco light',q:50},
       {n:'Yogurt greco 0%',q:50},{n:'Garam masala',q:3},
       {n:'Cumino',q:2},{n:'Zenzero fresco',q:5},{n:'Aglio',q:5},
       {n:'Olio EVO',q:4}],
  proc:'Gli spinaci vanno cotti 15 minuti in pochissima acqua e frullati — 600 g freschi diventano circa 120 g di crema verde densa. Intanto rosola il pollo a cubi, mettilo da parte. Nella stessa pentola: spezie, soffritto, ceci, latte di cocco, 10 minuti. Unisci la crema di spinaci e il pollo, altri 5 minuti. Yogurt fuori dal fuoco.',
  nota:'Il pollo non è opzionale. Senza, il piatto si ferma a 18 g di proteine per porzione — un terzo di quello che serve a cena.' },

{ id:'ven-spu', nome:'Yogurt greco e semi di lino', tipo:'spuntino', g:4,
  tempo:3, difficolta:'facile',
  val:[150,19],
  ing:[{n:'Yogurt greco 0%',q:170},{n:'Semi di lino',q:10},
       {n:'Cannella',q:1}],
  nota:'I semi di lino interi passano indigeriti. Vanno macinati al momento, o non servono a niente.' },

/* ============================= SABATO =========================== */
{ id:'sab-col', nome:'Uova e fagioli neri speziati', tipo:'colazione', g:5,
  tempo:18, difficolta:'media',
  val:[420,26],
  ing:[{b:'fagioli',q:110},{n:'Uova',q:2},
       {n:'Pane integrale',q:25},{n:'Cipolle dorate',q:30},
       {n:'Passata di pomodoro',q:40},{n:'Cumino',q:2},
       {n:'Paprika affumicata',q:2},{n:'Olio EVO',q:4}],
  proc:'Cipolla tritata fine nell\'olio, 6 minuti a fuoco basso finché non è trasparente. Cumino e paprika 30 secondi, poi fagioli e passata, schiaccia un terzo dei fagioli con la forchetta perché il piatto leghi. 8 minuti. Uova all\'occhio di bue in una padella a parte, sopra.' },

{ id:'sab-pra', nome:'Hot dog di pollo con cipolle caramellate', tipo:'pranzo', g:5,
  tempo:12, difficolta:'facile',
  val:[450,27],
  ing:[{b:'cipolle',q:50},{b:'vellutata',q:250,soloLui:true},
       {n:'Salsiccia di pollo o tacchino',q:100},
       {n:'Panino piccolo',q:0.5},{n:'Senape',q:8},
       {n:'Insalata mista',q:80,soloLei:true},{n:'Pomodorini',q:60,soloLei:true},
       {n:'Olio EVO',q:5,soloLei:true},{n:'Aceto di riso',q:5,soloLei:true}],
  proc:'Salsicce in padella senza olio, fuoco medio, 10 minuti girandole spesso: devono abbrustolirsi, non bollire nel loro liquido. Pane tostato dalla parte del taglio. Cipolle caramellate scaldate, senape, salsiccia.',
  vincolo:{lei:'Insalata mista e pomodorini a parte, olio e aceto.',
           lui:'250 g di vellutata come contorno caldo al posto dell\'insalata. È il pasto dove la differenza tra i due piatti è più visibile, ed è anche l\'unico in cui non ho trovato un modo di renderla invisibile.'},
  nota:'Unico pasto dove il valore kcal/proteine indicato è quello di lei ma non è esattamente quello che mangia lui: la vellutata calda pesa un po\' di più della sua insalata. Non quantificato per non inventare un numero — resta comunque il pasto con la differenza più visibile tra i due piatti.' },

{ id:'sab-cen', nome:'Curry thai rosso di gamberi', tipo:'cena', g:5,
  tempo:15, difficolta:'media',
  val:[505,40],
  ing:[{b:'soffritto',q:80},{n:'Gamberi sgusciati',q:180},
       {n:'Riso jasmine',q:50},{n:'Latte di cocco light',q:80},
       {n:'Pasta di curry rosso thai',q:15},{n:'Salsa di soia',q:8},
       {n:'Lime',q:12},{n:'Zenzero fresco',q:5},
       {n:'Olio EVO',q:4},{n:'Basilico thai',q:5}],
  proc:'Friggi la pasta di curry nell\'olio per 60 secondi prima di aggiungere qualsiasi liquido — è il passaggio che separa un curry thai da acqua rossa. Poi soffritto, latte di cocco, zenzero, 8 minuti. I gamberi entrano per ultimi, 3 minuti e basta: oltre diventano gomma. Lime a fuoco spento.',
  vincolo:{lei:'Basilico thai fresco strappato sopra alla fine.',
           lui:'Il basilico va dentro la salsa negli ultimi 2 minuti di cottura, così cede l\'aroma senza restare foglia.'} },

{ id:'sab-spu', nome:'Skyr e cacao', tipo:'spuntino', g:5,
  tempo:2, difficolta:'facile',
  val:[110,20],
  ing:[{n:'Skyr 0%',q:170},{n:'Cacao amaro',q:5},{n:'Cannella',q:1}] },

/* ============================ DOMENICA ========================== */
{ id:'dom-col', nome:'Uova strapazzate e skyr', tipo:'colazione', g:6,
  tempo:8, difficolta:'facile',
  desc:'Domenica non è una giornata di avanzi improvvisati: colazione e pranzo sono costruiti per arrivare sazi alla cena libera.',
  val:[415,33],
  ing:[{n:'Uova',q:2},{n:'Albumi',q:2},{b:'soffritto',q:80},
       {n:'Skyr 0%',q:100},{n:'Pane integrale',q:25},
       {n:'Olio EVO',q:4}] },

{ id:'dom-pra', nome:'Chili dal freezer con riso', tipo:'pranzo', g:6,
  tempo:8, difficolta:'facile',
  desc:'I 700 g di chili avanzati dalla domenica precedente.',
  val:[520,27],
  ing:[{b:'chili',q:300},{n:'Riso basmati',q:45},
       {n:'Yogurt greco 0%',q:60},{n:'Lime',q:10}],
  nota:'Se lo selezioni qui, la spesa conta il chili come da preparare. Se invece lo prendi dal freezer della settimana scorsa, toglilo dalla lista.' },

{ id:'dom-cen', nome:'Pasto libero', tipo:'cena', g:6, libero:true,
  desc:'È qui che va la pizza, ogni 2-3 settimane. Budget indicativo: ~600 kcal. Non pesatelo, non contatelo.',
  val:[600,10],
  ing:[],
  proc:'Tre regole, e sono le uniche che contano. 1) Non tagliate colazione e pranzo per far spazio: arrivare affamati a una cena libera è il modo più affidabile di raddoppiarla. 2) Una cena libera a settimana sposta la media settimanale di 60-90 kcal al giorno, cioè niente. Due o tre no. 3) Riprendete lunedì mattina, non "da lunedì prossimo".' },
];

// nomi corti per i tag nelle schede
const BREVE = {soffritto:'soffritto', ceci:'ceci cotti', fagioli:'fagioli neri',
  lenticchie:'lenticchie verdi', pulled:'pulled chicken', chili:'chili', ragu:'ragù',
  vellutata:'vellutata', salsayogurt:'salsa yogurt', cipolle:'cipolle caram.',
  salsapeperoni:'salsa peperoni', hummus:'hummus', falafel:'falafel', riso:'riso cotto'};
BASI.forEach(b => b.breve = BREVE[b.id] || b.nome);

const TARGET = {kcal:1450, p:115};

const GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const TIPI   = [['colazione','Colazione'],['pranzo','Pranzo'],['cena','Cena'],['spuntino','Spuntino']];

if (typeof module !== 'undefined') module.exports = {ING, REPARTI, BASI, PASTI, TARGET, GIORNI, TIPI};
