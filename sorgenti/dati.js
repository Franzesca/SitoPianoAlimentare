/* ==========================================================================
   DietaCosi — modello dati · PIANO AUTUNNO 2026 (1.250 kcal, porzione unica)
   Fonte unica dei pasti e delle basi. I documenti piano-pasti-definitivo.md
   e preparazione-domenicale.md vengono GENERATI da questo file
   (node genera-doc.js), non scritti a mano.

   Valori nutrizionali: ogni ingrediente in ING porta k (kcal/100 g) e p
   (g proteine/100 g) — valori medi da tabelle di composizione standard
   (CREA/USDA) arrotondati, riferiti al prodotto crudo e al netto. kcal e
   proteine di basi e pasti NON sono dichiarati a mano: si calcolano da qui
   (funzioni in fondo al file). Cambiare una grammatura aggiorna tutto.
   ========================================================================== */

/* ---------- 1. Registro ingredienti ----------------------------------------
   r = reparto · u = unità ('g' | 'pz') · pz = grammi per pezzo
   k = kcal/100 g · p = proteine g/100 g
   nc = non si compra (acqua, brodo) · lei = crudo, solo nel piatto di lei
   comeSucco = la quantità nei pasti è in grammi di succo
   ------------------------------------------------------------------------ */
const ING = {
  // — Carne e pesce
  'Sovracosce di pollo disossate senza pelle': {r:'carne', u:'g', k:121, p:19.7},
  'Petto di pollo':                            {r:'carne', u:'g', k:110, p:23},
  'Petto di tacchino':                         {r:'carne', u:'g', k:107, p:24},
  'Macinato di tacchino':                      {r:'carne', u:'g', k:130, p:20},
  'Manzo magro per ragù':                      {r:'carne', u:'g', k:130, p:21},
  'Manzo magro macinato':                      {r:'carne', u:'g', k:130, p:21},
  'Salsiccia di pollo o tacchino':             {r:'carne', u:'g', k:160, p:16},
  'Fesa di tacchino affettata':                {r:'carne', u:'g', k:110, p:22},
  'Gamberi sgusciati':                         {r:'carne', u:'g', k:85,  p:20},
  'Merluzzo (filetti)':                        {r:'carne', u:'g', k:80,  p:18, nota:'anche surgelato, o nasello'},
  'Tonno al naturale (sgocciolato)':           {r:'carne', u:'g', k:100, p:24},

  // — Uova e latticini
  'Uova':                       {r:'latticini', u:'pz', pz:55, k:143, p:12.6},
  'Albumi':                     {r:'latticini', u:'pz', pz:33, k:52,  p:11, nota:'ricavabili dalle uova, se non compri gli albumi liquidi'},
  'Skyr 0%':                    {r:'latticini', u:'g', k:60,  p:10.5},
  'Yogurt greco 0%':            {r:'latticini', u:'g', k:57,  p:10},
  'Ricotta magra':              {r:'latticini', u:'g', k:138, p:9},
  'Feta':                       {r:'latticini', u:'g', k:265, p:14},
  'Formaggio magro grattugiato':{r:'latticini', u:'g', k:250, p:27},
  'Grana grattugiato':          {r:'latticini', u:'g', k:390, p:33},
  'Latte parzialmente scremato':{r:'latticini', u:'g', k:46,  p:3.3},

  // — Legumi, cereali, farine
  'Ceci secchi':                {r:'secchi', u:'g', k:350, p:20},
  'Fagioli neri secchi':        {r:'secchi', u:'g', k:340, p:21.5},
  'Fagioli borlotti secchi':    {r:'secchi', u:'g', k:335, p:22, nota:'o cannellini'},
  'Lenticchie verdi secche':    {r:'secchi', u:'g', k:350, p:24},
  'Lenticchie rosse secche':    {r:'secchi', u:'g', k:350, p:24},
  'Riso basmati':               {r:'secchi', u:'g', k:355, p:8},
  'Riso jasmine':               {r:'secchi', u:'g', k:355, p:7},
  'Orzo perlato':               {r:'secchi', u:'g', k:350, p:10},
  'Farro perlato':              {r:'secchi', u:'g', k:340, p:12},
  'Pasta secca integrale':      {r:'secchi', u:'g', k:340, p:13},
  'Bulgur':                     {r:'secchi', u:'g', k:342, p:12},
  'Farina per polenta integrale':{r:'secchi', u:'g', k:360, p:8},
  'Farina integrale':           {r:'secchi', u:'g', k:340, p:13},
  'Farina 0':                   {r:'secchi', u:'g', k:364, p:11},
  'Fiocchi d\'avena':           {r:'secchi', u:'g', k:375, p:13.5},
  'Farina di ceci':             {r:'secchi', u:'g', k:385, p:22},
  'Pangrattato':                {r:'secchi', u:'g', k:350, p:12},
  'Lievito di birra secco':     {r:'secchi', u:'g', k:320, p:40},
  'Lievito per dolci':          {r:'secchi', u:'g', k:0,   p:0},

  // — Pane e tortillas
  'Pane integrale':             {r:'pane', u:'g', k:245, p:9, nota:'o il pane ai semi fatto in casa, stessi grammi'},
  'Tortilla integrale media':   {r:'pane', u:'pz', pz:50, k:300, p:9},
  'Panino piccolo':             {r:'pane', u:'pz', pz:65, k:280, p:9},

  // — Ortofrutta (grammature al netto)
  'Cipolle dorate':             {r:'orto', u:'g', k:40, p:1},
  'Cipolla rossa':              {r:'orto', u:'g', k:40, p:1, lei:true},
  'Cipollotto':                 {r:'orto', u:'g', k:32, p:2, lei:true},
  'Carote':                     {r:'orto', u:'g', k:40, p:1},
  'Sedano':                     {r:'orto', u:'g', k:15, p:0.7},
  'Peperoni rossi':             {r:'orto', u:'g', k:30, p:1},
  'Aglio':                      {r:'orto', u:'g', k:150, p:6},
  'Zenzero fresco':             {r:'orto', u:'g', k:80, p:2},
  'Zucca':                      {r:'orto', u:'g', k:35, p:1, nota:'pulita: compra ~30% in più'},
  'Spinaci freschi':            {r:'orto', u:'g', k:23, p:3},
  'Cavolo nero':                {r:'orto', u:'g', k:40, p:3.5, nota:'solo foglia, senza costa: compra ~50% in più'},
  'Verza':                      {r:'orto', u:'g', k:27, p:1.5},
  'Cavolfiore':                 {r:'orto', u:'g', k:25, p:2, nota:'cimette: compra ~30% in più'},
  'Broccoli':                   {r:'orto', u:'g', k:34, p:3, nota:'cimette: compra ~35% in più'},
  'Porri':                      {r:'orto', u:'g', k:60, p:1.5, nota:'solo la parte bianca e verde chiaro'},
  'Finocchi':                   {r:'orto', u:'g', k:31, p:1},
  'Radicchio':                  {r:'orto', u:'g', k:23, p:1.5, nota:'di Treviso o di Chioggia'},
  'Patate':                     {r:'orto', u:'g', k:77, p:2},
  'Patate dolci':               {r:'orto', u:'g', k:86, p:1.6},
  'Piselli surgelati':          {r:'orto', u:'g', k:80, p:5},
  'Limoni':                     {r:'orto', u:'g', pz:40, comeSucco:true, k:22, p:0},
  'Lime':                       {r:'orto', u:'g', pz:30, comeSucco:true, k:25, p:0},
  'Pomodoro fresco':            {r:'orto', u:'g', k:18, p:1, lei:true},
  'Pomodorini':                 {r:'orto', u:'g', k:18, p:1, lei:true},
  'Cetriolo':                   {r:'orto', u:'g', k:15, p:0.7, lei:true},
  'Insalata mista':             {r:'orto', u:'g', k:15, p:1, lei:true},
  'Coriandolo fresco':          {r:'orto', u:'g', k:23, p:2, lei:true},
  'Prezzemolo fresco':          {r:'orto', u:'g', k:36, p:3},
  'Menta fresca':               {r:'orto', u:'g', k:44, p:3, lei:true},
  'Basilico thai':              {r:'orto', u:'g', k:23, p:3},
  'Rosmarino':                  {r:'orto', u:'pz', pz:5, k:130, p:3},
  'Mele':                       {r:'orto', u:'g', k:52, p:0.3},
  'Pere':                       {r:'orto', u:'g', k:57, p:0.4},
  'Banane':                     {r:'orto', u:'g', k:89, p:1.1},

  // — Scatolame e conserve
  'Pomodori pelati':            {r:'scatolame', u:'g', k:25, p:1.2},
  'Passata di pomodoro':        {r:'scatolame', u:'g', k:30, p:1.3},
  'Concentrato di pomodoro':    {r:'scatolame', u:'g', k:80, p:4},
  'Latte di cocco light':       {r:'scatolame', u:'g', k:75, p:0.5},
  'Kimchi':                     {r:'scatolame', u:'g', k:15, p:1, lei:true},
  'Olive nere':                 {r:'scatolame', u:'g', k:145, p:1, nota:'denocciolate'},

  // — Dispensa
  'Olio EVO':                   {r:'dispensa', u:'g', k:900, p:0},
  'Olio di sesamo':             {r:'dispensa', u:'g', k:900, p:0},
  'Tahina':                     {r:'dispensa', u:'g', k:600, p:17},
  'Salsa di soia':              {r:'dispensa', u:'g', k:55, p:8},
  'Gochujang':                  {r:'dispensa', u:'g', k:200, p:4},
  'Pasta di curry rosso thai':  {r:'dispensa', u:'g', k:150, p:2},
  'Harissa':                    {r:'dispensa', u:'g', k:100, p:3},
  'Senape':                     {r:'dispensa', u:'g', k:66, p:4},
  'Miele':                      {r:'dispensa', u:'g', k:300, p:0},
  'Zucchero':                   {r:'dispensa', u:'g', k:400, p:0},
  'Aceto di riso':              {r:'dispensa', u:'g', k:20, p:0, nota:'o aceto di mele'},
  'Aceto balsamico':            {r:'dispensa', u:'g', k:90, p:0},
  'Vino rosso':                 {r:'dispensa', u:'g', k:85, p:0},
  'Vino bianco':                {r:'dispensa', u:'g', k:80, p:0},
  'Cacao amaro':                {r:'dispensa', u:'g', k:230, p:20},
  'Burro d\'arachidi 100%':     {r:'dispensa', u:'g', k:590, p:25},
  'Noci':                       {r:'dispensa', u:'g', k:655, p:15},
  'Semi di zucca':              {r:'dispensa', u:'g', k:560, p:30},
  'Semi misti':                 {r:'dispensa', u:'g', k:560, p:22, nota:'girasole, zucca, lino: anche un solo tipo'},
  'Semi di sesamo':             {r:'dispensa', u:'g', k:575, p:18},
  'Cioccolato fondente 85%':    {r:'dispensa', u:'g', k:580, p:12},
  'Bicarbonato':                {r:'dispensa', u:'g', k:0, p:0},
  'Sale':                       {r:'dispensa', u:'g', k:0, p:0},

  // — Spezie ed erbe secche
  'Cumino':                     {r:'spezie', u:'g', k:375, p:18},
  'Paprika affumicata':         {r:'spezie', u:'g', k:280, p:14},
  'Curcuma':                    {r:'spezie', u:'g', k:310, p:10},
  'Garam masala':               {r:'spezie', u:'g', k:320, p:14},
  'Coriandolo in polvere':      {r:'spezie', u:'g', k:300, p:12},
  'Cannella':                   {r:'spezie', u:'g', k:250, p:4},
  'Noce moscata':               {r:'spezie', u:'g', k:525, p:6},
  'Peperoncino':                {r:'spezie', u:'g', k:280, p:12},
  'Origano secco':              {r:'spezie', u:'g', k:265, p:9},
  'Menta secca':                {r:'spezie', u:'g', k:285, p:20},
  'Aglio in polvere':           {r:'spezie', u:'g', k:330, p:16},
  'Pepe nero':                  {r:'spezie', u:'g', k:250, p:10},
  'Alloro':                     {r:'spezie', u:'pz', pz:0.2, k:0, p:0},

  // — Non si compra
  'Acqua':                      {r:'nc', u:'g', nc:true, k:0, p:0},
  'Brodo (o acqua)':            {r:'nc', u:'g', nc:true, k:0, p:0, nota:'acqua + dado se non hai brodo fatto'},
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
   serve comprare di più). Le basi possono contenere altre basi ('@id'):
   l'esplosione è ricorsiva.
   interoDefault: l'app propone "ricetta intera" invece di "quantità esatta"
   (zuppe e panificati: si fanno a dose piena e si congelano).
   porz = porzioni in cui dividere la resa · pezzi = pezzi prodotti
   ------------------------------------------------------------------------ */
const BASI = [
{ id:'soffritto', nome:'Soffritto lungo frullato', resa:1650,
  tempoAtt:20, tempoTot:95, gruppo:'fornelli',
  conserva:['5 giorni','3 mesi'],
  nota:'Dose dimezzata rispetto al vecchio piano: ora è una base tra le altre, non il centro di tutto. Frulla finché non è perfettamente liscia: è questo passaggio che la rende compatibile con il vincolo di lui.',
  proc:[
    'Trita tutto grossolanamente col robot da cucina, a impulsi, non a purea.',
    'Pentola larga, olio, tutte le verdure: coperchio, fuoco basso, 45 minuti. Mescola ogni 15. Devono collassare, non rosolare.',
    'Scoperchia, unisci pelati e concentrato. Altri 45 minuti a fuoco basso, scoperto: è qui che perde acqua.',
    'Frulla a immersione fino a crema perfettamente liscia.',
    'Dividi subito: quello che serve alla settimana in frigo, il resto in freezer in porzioni da 250 g.'],
  timer:[['Verdure coperte',45],['Con i pelati',45]],
  ing:[['Cipolle dorate',1250],['Carote',700],['Sedano',350],['Peperoni rossi',575],
       ['Aglio',22],['Olio EVO',45],['Pomodori pelati',600],['Concentrato di pomodoro',30],
       ['Sale',13]] },

{ id:'ceci', nome:'Ceci cotti', resa:1130, gruppo:'fornelli', tempoAtt:5, tempoTot:40,
  conserva:['4 giorni','3 mesi'],
  nota:'Se quella settimana fai anche i falafel, ammolla insieme anche i ceci secchi del loro impasto (la quantità è nella scheda dei falafel): quelli restano crudi.',
  proc:['Ammollo 12 ore con il bicarbonato.','Scola. Pentola a pressione 40 minuti con l\'alloro.','Sala a fine cottura. Tieni un po\' di acqua di cottura se fai l\'hummus.'],
  timer:[['Pentola a pressione',40]],
  ing:[['Ceci secchi',450],['Bicarbonato',3],['Alloro',2],['Sale',8]] },

{ id:'fagioli', nome:'Fagioli neri cotti', resa:1000, gruppo:'fornelli', tempoAtt:5, tempoTot:35,
  conserva:['4 giorni','3 mesi'],
  proc:['Ammollo 12 ore.','Pentola a pressione 35 minuti.','Sala a fine cottura.'],
  timer:[['Pentola a pressione',35]],
  ing:[['Fagioli neri secchi',400],['Alloro',2],['Sale',7]] },

{ id:'borlotti', nome:'Fagioli borlotti cotti', resa:750, gruppo:'fornelli', tempoAtt:5, tempoTot:30,
  conserva:['4 giorni','3 mesi'],
  proc:['Ammollo 12 ore.','Pentola a pressione 30 minuti.','Sala a fine cottura.'],
  timer:[['Pentola a pressione',30]],
  ing:[['Fagioli borlotti secchi',300],['Alloro',2],['Sale',5]] },

{ id:'lenticchie', nome:'Lenticchie verdi cotte', resa:500, gruppo:'fornelli', tempoAtt:3, tempoTot:25,
  conserva:['4 giorni','3 mesi'],
  proc:['25 minuti in acqua non salata, scolate.'],
  timer:[['Cottura',25]],
  ing:[['Lenticchie verdi secche',200]] },

{ id:'pulled', nome:'Pulled chicken', resa:890, gruppo:'forno', tempoAtt:10, tempoTot:130,
  conserva:['3 giorni','2 mesi'],
  nota:'Non condirlo adesso: va in direzioni diverse durante la settimana. Resa dopo cottura ~68% del crudo. Se il forno ti serve per zuppe e panificati, mettilo dentro per primo la mattina: sono 2 ore passive.',
  proc:['Massaggia le sovracosce con le spezie e il sale.','Forno 150 °C, 2 ore, teglia coperta con alluminio, con il brodo sul fondo.','Sfilaccia con due forchette.'],
  timer:[['Forno 150 °C',120]],
  ing:[['Sovracosce di pollo disossate senza pelle',1300],['Cumino',10],['Paprika affumicata',8],
       ['Aglio in polvere',6],['Sale',14],['Pepe nero',3],['Brodo (o acqua)',150]] },

{ id:'focaccine', nome:'Focaccine integrali', resa:464, pezzi:8, gruppo:'forno', tempoAtt:20, tempoTot:175,
  interoDefault:true,
  conserva:['3 giorni','2 mesi'],
  nota:'La colazione salata della settimana: pochi minuti di lavoro e tanta attesa, quindi l\'impasto parte per primo la domenica. Se escono basse e dure, quasi sempre è uno di tre motivi: lievito sbagliato o morto (la prova della schiuma lo dice subito), lievitazione troppo corta in una casa fresca, dischi troppo sottili. Resa da cotte stimata (~58 g a focaccina): se pesandole ti viene diversa, va corretta.',
  proc:['Controlla il lievito: deve essere lievito di birra secco (bustina "lievito di birra secco attivo"), non il lievito istantaneo per pizze e torte salate, che è chimico e con la lievitazione lunga non fa niente.',
        'Sciogli lievito e zucchero in un terzo dell\'acqua, tiepida e non calda (al polso deve sembrare appena tiepida, sui 35 °C: sopra i 45 °C il lievito muore). Dopo 10 minuti deve aver fatto schiuma in superficie. Se non la fa, il lievito è da buttare: inutile andare avanti.',
        'Impastatrice: farine, acqua col lievito e il resto dell\'acqua, 4 minuti a velocità bassa; poi olio e sale, altri 6 minuti a velocità media. L\'impasto resta morbido e un po\' appiccicoso: con la farina integrale è giusto così, non aggiungere farina.',
        'Lievitazione coperta in un posto tiepido (il forno spento con la sola luce accesa è perfetto) finché non raddoppia davvero di volume: 1 ora e mezza, anche 2 se la casa è fresca. Conta il volume, non l\'orologio.',
        'Dividi in {pezzi:pezzo|pezzi} da ~65 g di impasto, arrotondali a pallina e appiattiscili appena, a dischi spessi 2 cm: più sottili diventano biscotti. Su carta forno, coperti, altri 40-45 minuti, finché non si gonfiano di nuovo.',
        'Fossette con i polpastrelli, rosmarino e un pizzico di sale sopra. Forno già caldo a 200 °C, 14-16 minuti, finché non sono dorate anche sotto. Appena sfornate coprile con un canovaccio mentre si raffreddano: restano morbide.',
        'Fredde, in freezer a coppie: 3 minuti in forno o tostapane la mattina.'],
  timer:[['Schiuma del lievito',10],['Lievitazione',90],['Seconda lievitazione',40],['Forno 200 °C',15]],
  ing:[['Farina integrale',200],['Farina 0',90],['Acqua',215],['Lievito di birra secco',4],
       ['Olio EVO',15],['Sale',5],['Zucchero',4],['Rosmarino',1]] },

{ id:'pane', nome:'Pane integrale ai semi', resa:800, gruppo:'forno', tempoAtt:15, tempoTot:200,
  interoDefault:true,
  conserva:['3 giorni','2 mesi (a fette)'],
  nota:'La ricetta intera è una pagnotta da 800 g.{multipla: Con più di una dose fai pagnotte separate, non una gigante: i tempi di forno restano quelli.} Tagliala a fette da 40-50 g e congelale: si tostano da congelate. Vale anche come "modulo +150" (50 g) nelle sere in cui la cena è una zuppa.',
  proc:['Impastatrice: farine, semi, lievito, miele, acqua tiepida, 3 minuti; poi il sale, 8 minuti a velocità media.',
        'Lievitazione coperta 90 minuti.',
        'Forma la pagnotta su carta forno, incidi la superficie, altri 40 minuti coperta.',
        'Forno 220 °C per 15 minuti, poi 200 °C per altri 25.{ridotta: Con una pagnotta più piccola controlla già dopo 30 minuti in tutto: battendo sotto deve suonare vuota.} Fredda completamente prima di tagliarla.'],
  timer:[['Lievitazione',90],['Seconda lievitazione',40],['Forno 220 °C',15],['Forno 200 °C',25]],
  ing:[['Farina integrale',450],['Farina 0',50],['Semi misti',60],['Acqua',350],
       ['Lievito di birra secco',5],['Sale',9],['Miele',5]] },

{ id:'zucca', nome:'Crema di zucca arrosto e ceci', resa:2000, porz:5, gruppo:'forno', tempoAtt:15, tempoTot:55,
  interoDefault:true,
  conserva:['4 giorni','3 mesi'],
  nota:'{porz:porzione|porzioni} da ~400 g. La zucca arrostita in forno invece che bollita è quello che fa la differenza: caramella e la crema non ha bisogno d\'altro.',
  proc:['Zucca a cubi da 3 cm e cipolla a spicchi in una teglia con olio, rosmarino, aglio in camicia e sale: forno 200 °C per 35-40 minuti, finché i bordi non caramellano.',
        'Butta il rosmarino, sbuccia l\'aglio, versa tutto in pentola con i ceci e il brodo caldo.',
        'Frulla a immersione fino a crema liscia. Se è troppo densa, altro brodo; se troppo liquida, 5 minuti sul fuoco scoperta.',
        'Dividi in {porz:porzione|porzioni} uguali: in frigo quelle dei prossimi 3-4 giorni, il resto in freezer.'],
  timer:[['Forno 200 °C',38]],
  ing:[['Zucca',1000],['Cipolle dorate',150],['Aglio',8],['Rosmarino',2],['Olio EVO',20],
       ['@ceci',400],['Brodo (o acqua)',800],['Sale',8]] },

{ id:'lentcavolo', nome:'Zuppa di lenticchie e cavolo nero', resa:2000, porz:5, gruppo:'fornelli', tempoAtt:15, tempoTot:40,
  interoDefault:true,
  conserva:['4 giorni','3 mesi'],
  nota:'{porz:porzione|porzioni} da ~400 g. Si fa sui fornelli mentre il forno è occupato. Per lui va frullata tutta: il cavolo nero cotto ma a strisce è fuori vincolo.',
  proc:['Soffritto, olio, aglio e rosmarino in pentola, 2 minuti.',
        'Patate a cubetti, passata e brodo: 12 minuti.',
        'Cavolo nero a striscioline (solo la foglia) e lenticchie: altri 15 minuti.',
        'Togli il rosmarino e frulla tutto a immersione, fino a crema. Dividi in {porz:porzione|porzioni}.'],
  timer:[['Patate',12],['Cavolo nero e lenticchie',15]],
  ing:[['@lenticchie',500],['Cavolo nero',300],['Patate',250],['@soffritto',200],['Passata di pomodoro',120],
       ['Olio EVO',18],['Aglio',5],['Rosmarino',1],['Brodo (o acqua)',900],['Sale',6]] },

{ id:'cavolfiore', nome:'Crema di cavolfiore e porri', resa:2000, porz:5, gruppo:'forno', tempoAtt:15, tempoTot:55,
  interoDefault:true,
  conserva:['4 giorni','3 mesi'],
  nota:'{porz:porzione|porzioni} da ~400 g. Il cavolfiore arrostito perde il suo odore da bollito: è la crema più delicata del piano.',
  proc:['Cavolfiore a cimette, porri a rondelle spesse, patate a cubi: in teglia con olio, aglio in camicia e sale, forno 200 °C per 35 minuti, girando a metà.',
        'Sbuccia l\'aglio, versa tutto in pentola con il brodo caldo e la noce moscata.',
        'Frulla a immersione fino a crema liscia. Dividi in {porz:porzione|porzioni}.'],
  timer:[['Forno 200 °C',35]],
  ing:[['Cavolfiore',900],['Porri',300],['Patate',300],['Aglio',8],['Olio EVO',20],
       ['Brodo (o acqua)',900],['Sale',8],['Noce moscata',1]] },

{ id:'orzoborlotti', nome:'Minestra di orzo, borlotti e verza', resa:2400, porz:6, gruppo:'fornelli', tempoAtt:15, tempoTot:65,
  interoDefault:true,
  conserva:['4 giorni','3 mesi'],
  nota:'{porz:porzione|porzioni} da ~400 g. La verza e metà dei borlotti vengono frullati prima di aggiungere l\'orzo: la minestra lega, resta rustica e per lui la verdura è passata.',
  proc:['Soffritto, olio, alloro e rosmarino in pentola, 2 minuti.',
        'Verza a strisce, patate a cubetti, passata, metà dei borlotti e il brodo: 25 minuti.',
        'Togli alloro e rosmarino; frulla tutto liscio.',
        'Rimetti sul fuoco con l\'orzo sciacquato e i borlotti rimasti: 25-30 minuti, finché l\'orzo non è tenero. Se stringe, altro brodo. Dividi in {porz:porzione|porzioni}.'],
  timer:[['Verza e patate',25],['Orzo',28]],
  ing:[['Orzo perlato',200],['@borlotti',600],['Verza',500],['Patate',200],['@soffritto',250],
       ['Passata di pomodoro',150],['Alloro',2],['Rosmarino',1],['Olio EVO',20],['Brodo (o acqua)',1300],['Sale',8]] },

{ id:'broccoli', nome:'Crema di broccoli e patate', resa:2000, porz:5, gruppo:'forno', tempoAtt:15, tempoTot:45,
  interoDefault:true,
  conserva:['4 giorni','3 mesi'],
  nota:'{porz:porzione|porzioni} da ~400 g. I broccoli in forno bruciano facilmente: 25 minuti, non di più.',
  proc:['Broccoli a cimette e porri a rondelle in teglia con olio, aglio e sale: forno 200 °C per 25 minuti.',
        'Intanto le patate a cubi cuociono nel brodo, 15 minuti.',
        'Tutto insieme in pentola, frulla a immersione fino a crema. Dividi in {porz:porzione|porzioni}.'],
  timer:[['Forno 200 °C',25],['Patate nel brodo',15]],
  ing:[['Broccoli',800],['Patate',400],['Porri',200],['Aglio',8],['Olio EVO',20],
       ['Brodo (o acqua)',900],['Sale',8]] },

{ id:'carote', nome:'Crema di carote arrosto e lenticchie rosse allo zenzero', resa:2200, porz:5, gruppo:'forno', tempoAtt:15, tempoTot:50,
  interoDefault:true,
  conserva:['4 giorni','3 mesi'],
  nota:'{porz:porzione|porzioni} da ~440 g. Le lenticchie rosse spariscono nella crema e la rendono vellutata senza latticini.',
  proc:['Carote a tocchi e cipolla a spicchi in teglia con olio, cumino e sale: forno 200 °C per 35 minuti.',
        'Intanto lenticchie rosse, zenzero grattugiato, aglio e curcuma nel brodo: 20 minuti, finché non si disfano.',
        'Unisci le carote, frulla a immersione fino a crema, limone a fuoco spento. Dividi in {porz:porzione|porzioni}.'],
  timer:[['Forno 200 °C',35],['Lenticchie nel brodo',20]],
  ing:[['Carote',800],['Lenticchie rosse secche',250],['Cipolle dorate',150],['Zenzero fresco',20],['Aglio',8],
       ['Curcuma',4],['Cumino',4],['Olio EVO',20],['Brodo (o acqua)',1200],['Sale',9],['Limoni',20]] },

{ id:'muffin', nome:'Muffin avena, ricotta e mela', resa:660, pezzi:12, gruppo:'forno', tempoAtt:12, tempoTot:40,
  interoDefault:true,
  conserva:['3 giorni','2 mesi'],
  nota:'{pezzi:muffin|muffin} da ~55 g. La mela cuoce dentro, quindi va bene anche per lui. Congelali a coppie: 20 secondi di microonde o 5 minuti in forno la mattina.',
  proc:['Frulla ricotta, albumi, uovo, miele e olio fino a crema liscia.',
        'Unisci avena, farina, lievito, cannella e sale; per ultima la mela a dadini piccoli.',
        '{pezzi:pirottino|pirottini}, forno 180 °C per 22-24 minuti: lo stecchino deve uscire asciutto.',
        'Freddi su una griglia, poi in freezer.'],
  timer:[['Forno 180 °C',23]],
  ing:[['Fiocchi d\'avena',120],['Farina integrale',60],['Ricotta magra',200],['Albumi',5],['Uova',1],
       ['Miele',30],['Mele',150],['Olio EVO',10],['Lievito per dolci',8],['Cannella',3],['Sale',1]] },

{ id:'muffinzucca', nome:'Muffin zucca e cannella', resa:680, pezzi:12, gruppo:'forno', tempoAtt:12, tempoTot:45,
  interoDefault:true,
  conserva:['3 giorni','2 mesi'],
  nota:'{pezzi:muffin|muffin} da ~57 g. La zucca li tiene umidi per giorni.',
  proc:['Zucca a cubetti 8 minuti al microonde (o al vapore), schiacciata a purea e lasciata intiepidire.',
        'Frulla la purea con yogurt, albumi, uovo, miele e olio.',
        'Unisci avena, farina, lievito, cannella, noce moscata e sale.',
        '{pezzi:pirottino|pirottini}, forno 180 °C per 24 minuti. Freddi, in freezer.'],
  timer:[['Forno 180 °C',24]],
  ing:[['Zucca',250],['Fiocchi d\'avena',120],['Farina integrale',80],['Yogurt greco 0%',150],['Albumi',3],['Uova',1],
       ['Miele',30],['Olio EVO',10],['Lievito per dolci',8],['Cannella',4],['Noce moscata',1],['Sale',1]] },

{ id:'plumcake', nome:'Plumcake yogurt e pera', resa:720, pezzi:10, gruppo:'forno', tempoAtt:12, tempoTot:55,
  interoDefault:true,
  conserva:['3 giorni','2 mesi (a fette)'],
  nota:'{pezzi:fetta|fette} da ~72 g. Tagliato e congelato a fette, ne esce una alla volta.',
  proc:['Sbatti uova, albumi, miele, olio e yogurt.',
        'Unisci farina, avena, lievito, cannella e sale; poi la pera a dadini.',
        'Stampo da plumcake foderato, forno 180 °C per 40 minuti. Stecchino asciutto.{ridotta: Con una dose ridotta usa uno stampo più piccolo (o chiudi metà di quello grande con una sponda di carta forno piegata) e controlla con lo stecchino già dopo 30 minuti.}{multipla: Con più di una dose usa più stampi, non uno più grande: i tempi restano quelli.}',
        'Freddo del tutto, poi {pezzi:fetta|fette}.'],
  timer:[['Forno 180 °C',40]],
  ing:[['Farina integrale',150],['Fiocchi d\'avena',50],['Yogurt greco 0%',200],['Uova',2],['Albumi',2],
       ['Miele',40],['Olio EVO',15],['Pere',200],['Lievito per dolci',8],['Cannella',2],['Sale',1]] },

{ id:'crackers', nome:'Crackers integrali ai semi', resa:380, gruppo:'forno', tempoAtt:15, tempoTot:40,
  interoDefault:true,
  conserva:['10 giorni in scatola di latta','—'],
  nota:'Circa {resa} di crackers. Non hanno bisogno del freezer: in una scatola chiusa restano croccanti.',
  proc:['Impasta farina, semi, olio, acqua e sale (anche a mano: 3 minuti).',
        'Stendi sottile, 2 mm, direttamente su carta forno. Taglia a rettangoli con la rotella, bucherella con una forchetta, rosmarino e sale sopra.',
        'Forno 180 °C per 18-20 minuti, finché non sono dorati. Freddi diventano croccanti.'],
  timer:[['Forno 180 °C',19]],
  ing:[['Farina integrale',250],['Semi misti',40],['Olio EVO',20],['Acqua',120],['Sale',4],['Rosmarino',1]] },

{ id:'chili', nome:'Chili di ceci e fagioli neri', resa:1400, gruppo:'fornelli', tempoAtt:8, tempoTot:20,
  conserva:['4 giorni','3 mesi'],
  nota:'Quello che avanza va in freezer: è il pasto di riserva per la sera in cui non avete voglia di niente.',
  proc:['Tutto in pentola, 20 minuti a fuoco medio-basso.'],
  timer:[['Cottura',20]],
  ing:[['@soffritto',600],['@ceci',350],['@fagioli',350],['Passata di pomodoro',200],
       ['Brodo (o acqua)',150],['Cumino',8],['Paprika affumicata',6],['Cacao amaro',5],
       ['Cannella',1],['Peperoncino',2],['Sale',6]] },

{ id:'ragu', nome:'Ragù al coltello', resa:800, gruppo:'fornelli', tempoAtt:15, tempoTot:100,
  conserva:['3 giorni','3 mesi'],
  proc:['Rosola la carne a fuoco alto e in due riprese: tutta insieme bolle invece di rosolare.',
        'Sfuma col vino rosso.','Unisci soffritto, passata e alloro. Fuoco bassissimo, 90 minuti.'],
  timer:[['Fuoco bassissimo',90]],
  ing:[['Manzo magro per ragù',500],['@soffritto',400],['Passata di pomodoro',200],
       ['Vino rosso',150],['Olio EVO',10],['Alloro',2],['Sale',6]] },

{ id:'vellutata', nome:'Vellutata di lenticchie rosse e zucca', resa:1500, gruppo:'fornelli', tempoAtt:10, tempoTot:35,
  conserva:['4 giorni','3 mesi'],
  nota:'Serve solo al curry di sovracosce: l\'app la scala al bisogno. A dose piena avanza molto, ed è un ottimo contorno caldo.',
  proc:['Tutto in pentola, 30 minuti.','Frulla.'],
  timer:[['Cottura',30]],
  ing:[['Lenticchie rosse secche',200],['Zucca',1100],['Cipolle dorate',100],['Zenzero fresco',15],
       ['Brodo (o acqua)',1200],['Olio EVO',15],['Curcuma',3],['Sale',9]] },

{ id:'salsayogurt', nome:'Salsa yogurt, aglio e menta secca', resa:560, gruppo:'freddo', tempoAtt:5, tempoTot:5,
  conserva:['4 giorni','—'],
  nota:'Menta secca, non fresca: essiccata ha un profilo più resinoso ed è quella giusta per questa salsa. Risolve anche il vincolo di lui.',
  proc:['Mescola tutto. Riposo in frigo almeno un\'ora.'],
  ing:[['Yogurt greco 0%',500],['Aglio',6],['Menta secca',4],['Limoni',15],['Sale',4],['Olio EVO',10]] },

{ id:'cipolle', nome:'Cipolle caramellate frullate', resa:250, gruppo:'fornelli', tempoAtt:8, tempoTot:45,
  conserva:['5 giorni','2 mesi'],
  nota:'Il condimento di hot dog e burger, e il sostituto strutturale di qualsiasi cipolla cruda per lui.',
  proc:['Fuoco basso 40 minuti finché non sono brune e dolci.','Frulla.'],
  timer:[['Fuoco basso',40]],
  ing:[['Cipolle dorate',500],['Olio EVO',15],['Aceto di riso',20],['Acqua',100],['Sale',4]] },

{ id:'hummus', nome:'Hummus', resa:420, gruppo:'freddo', tempoAtt:10, tempoTot:10,
  conserva:['5 giorni','2 mesi'],
  proc:['Frulla tutto a lungo, aggiungendo l\'acqua di cottura dei ceci poco per volta.'],
  ing:[['@ceci',250],['Tahina',50],['Limoni',35],['Acqua',60],['Olio EVO',15],
       ['Aglio',5],['Cumino',3],['Sale',4]] },

{ id:'falafel', nome:'Impasto falafel', resa:600, pezzi:12, gruppo:'freddo', tempoAtt:15, tempoTot:75,
  conserva:['3 giorni (da crudo)','—'],
  nota:'Ceci ammollati e crudi, mai cotti: con quelli cotti l\'impasto non lega e si disfa in forno. {pezzi:pezzo|pezzi} da 50 g; si infornano al momento, non la domenica.',
  proc:['Frulla a impulsi fino a granuloso, non a crema.','Riposo in frigo 1 ora.','Forma {pezzi:pallina|palline} da 50 g.',
        'Al momento: forno 200 °C per 20 minuti, girati a metà, spennellati d\'olio.'],
  timer:[['Riposo in frigo',60],['Forno 200 °C',20]],
  ing:[['Ceci secchi',150],['Cipolle dorate',50],['Aglio',8],['Prezzemolo fresco',20],
       ['Farina di ceci',25],['Cumino',5],['Coriandolo in polvere',4],['Bicarbonato',2],
       ['Sale',6],['Olio EVO',15]] },

{ id:'riso', nome:'Riso basmati cotto', resa:690, gruppo:'fornelli', tempoAtt:3, tempoTot:15,
  conserva:['3 giorni','—'],
  nota:'Il riso cotto si conserva massimo 3 giorni e va raffreddato in fretta, allargato su un vassoio. Se ti serve più avanti nella settimana, cuocilo fresco: sono 15 minuti.',
  proc:['Riso, acqua e sale, coperchio, 12 minuti.','Raffredda in fretta allargandolo su un vassoio.'],
  timer:[['Cottura',12]],
  ing:[['Riso basmati',250],['Acqua',440],['Sale',4]] },
];

/* ---------- 3. I pasti ---------------------------------------------------
   tipo = come conta nella giornata: colazione (200) · pranzo (450) · cena (600)
          · extra (moduli e sfizi, fuori dalla struttura)
   cat  = come si presenta nel catalogo: colazione · zuppa · pranzo · cena · extra
          (le zuppe sono quasi tutte pranzi da 450; la harira è una cena da 600)
   ing: {b:'idBase'|n:'Nome ingrediente', q, soloLei?, soloLui?, qb?}
   q = quantità per persona (porzione unica: entrambi mangiano la stessa cosa)
   soloLei = finitura a crudo che resta solo nel piatto di lei
   soloLui = equivalente cotto/frullato che resta solo nel piatto di lui
   qb: true = quanto basta (non pesa sulla lista)
   crudo: true = "pranzo da sola": ha verdure crude, non ha una versione per lui
   nuovo: true = nuovo del piano autunno
   val / valLui = kcal e proteine calcolati (in fondo al file), non dichiarati
   ------------------------------------------------------------------------ */
const PASTI = [
/* ====================== COLAZIONI (200 kcal) ====================== */
{ id:'col-muffin-skyr', nome:'Muffin avena e mela, con skyr', tipo:'colazione', nuovo:true,
  tempo:3, difficolta:'facile',
  desc:'Un muffin dal freezer e lo skyr: la colazione che si mangia in 3 minuti, anche in piedi.',
  ing:[{b:'muffin',q:55},{n:'Skyr 0%',q:120},{n:'Cannella',q:0,qb:true}],
  proc:'Muffin 20 secondi al microonde (o 5 minuti in forno mentre fai il caffè). Skyr a parte, cannella sopra.' },

{ id:'col-muffin-zucca', nome:'Due muffin zucca e cannella', tipo:'colazione', nuovo:true,
  tempo:2, difficolta:'facile',
  desc:'La colazione dolce d\'autunno. Due muffin, caffè, fine.',
  ing:[{b:'muffinzucca',q:114}],
  proc:'Se sono in freezer, 30 secondi al microonde. Se sono in frigo, così come sono.' },

{ id:'col-plumcake', nome:'Plumcake yogurt e pera, con yogurt greco', tipo:'colazione', nuovo:true,
  tempo:2, difficolta:'facile',
  ing:[{b:'plumcake',q:72},{n:'Yogurt greco 0%',q:100}],
  proc:'Una fetta, tostata 2 minuti se viene dal freezer. Yogurt a fianco, o sopra.' },

{ id:'col-focaccina-uovo', nome:'Focaccina con uovo sodo', tipo:'colazione', nuovo:true,
  tempo:3, difficolta:'facile',
  desc:'La colazione salata, semplice come chiedevi: una focaccina e un uovo.',
  ing:[{b:'focaccine',q:58},{n:'Uova',q:1},{n:'Sale',q:0,qb:true}],
  proc:'Focaccina 3 minuti in forno o tostapane. Le uova sode si fanno la domenica: 6 in un colpo, 9 minuti dall\'acqua che bolle, poi acqua fredda; 5 giorni in frigo col guscio.',
  nota:'Vale anche con la focaccina calda e l\'uovo tagliato dentro, a panino.' },

{ id:'col-focaccina-tacchino', nome:'Focaccina con fesa di tacchino', tipo:'colazione', nuovo:true,
  tempo:3, difficolta:'facile',
  ing:[{b:'focaccine',q:58},{n:'Fesa di tacchino affettata',q:40}],
  proc:'Focaccina calda tagliata a metà, la fesa dentro. Da mangiare anche per strada.' },

{ id:'col-pane-ricotta', nome:'Pane ai semi con ricotta e miele', tipo:'colazione', nuovo:true,
  tempo:3, difficolta:'facile',
  ing:[{b:'pane',q:40},{n:'Ricotta magra',q:70},{n:'Miele',q:4},{n:'Cannella',q:0,qb:true}],
  proc:'Pane tostato (anche da congelato), ricotta spalmata, un filo di miele e cannella.' },

{ id:'col-crackers-yogurt', nome:'Crackers ai semi con yogurt greco', tipo:'colazione', nuovo:true,
  tempo:2, difficolta:'facile',
  desc:'La colazione con più proteine del catalogo: 18 g. Ottima anche come merenda.',
  ing:[{b:'crackers',q:30},{n:'Yogurt greco 0%',q:150},{n:'Miele',q:3}],
  proc:'Yogurt in una ciotola con il miele, i crackers a parte o spezzettati dentro.' },

{ id:'col-pancake', nome:'Pancake avena e albumi con banana', tipo:'colazione', nuovo:true,
  tempo:8, difficolta:'facile',
  desc:'L\'unica colazione che si cucina al momento: 8 minuti, per le mattine in cui il freezer è vuoto.',
  ing:[{n:'Fiocchi d\'avena',q:30},{n:'Albumi',q:3},{n:'Banane',q:40},{n:'Cannella',q:1},{n:'Olio EVO',q:1}],
  proc:'Frulla tutto (o schiaccia la banana con la forchetta e mescola). Padella antiaderente appena unta, fuoco medio-basso, 3 pancake da 8 cm: 2 minuti per lato, girali quando compaiono le bollicine. La banana cuoce dentro: va bene anche per lui.' },

/* ====================== ZUPPE E CREME (450 kcal, pranzo) ====================== */
{ id:'zup-zucca', nome:'Crema di zucca e ceci con straccetti di pollo', tipo:'pranzo', cat:'zuppa', nuovo:true,
  tempo:8, difficolta:'facile',
  desc:'La zuppa dal freezer, il pollo in padella. 8 minuti.',
  ing:[{b:'zucca',q:400},{n:'Petto di pollo',q:100},{n:'Pane integrale',q:20},{n:'Semi di zucca',q:8},
       {n:'Paprika affumicata',q:1},{n:'Olio EVO',q:2}],
  proc:'Scalda la crema in pentola. Pollo a straccetti sottili, paprika e sale, padella rovente con il filo d\'olio, 3 minuti: sopra la crema. Semi di zucca tostati 1 minuto nella stessa padella. Pane tostato a parte.',
  nota:'A cena: aggiungi una focaccina o 50 g di pane ai semi (modulo +150).' },

{ id:'zup-lenticchie', nome:'Zuppa di lenticchie e cavolo nero con tacchino', tipo:'pranzo', cat:'zuppa', nuovo:true,
  tempo:10, difficolta:'facile',
  ing:[{b:'lentcavolo',q:400},{n:'Petto di tacchino',q:100},{n:'Pane integrale',q:20},{n:'Olio EVO',q:2},{n:'Limoni',q:5}],
  proc:'Scalda la zuppa. Tacchino a fette spesse un dito, piastra rovente 3 minuti per lato, 2 minuti di riposo, poi a strisce sopra la zuppa. Un filo d\'olio e qualche goccia di limone.',
  nota:'A cena: aggiungi una focaccina o 50 g di pane ai semi (modulo +150).' },

{ id:'zup-cavolfiore', nome:'Crema di cavolfiore e porri con gamberi e ceci', tipo:'pranzo', cat:'zuppa', nuovo:true,
  tempo:10, difficolta:'facile',
  ing:[{b:'cavolfiore',q:400},{n:'Gamberi sgusciati',q:130},{b:'ceci',q:60},{n:'Pane integrale',q:25},
       {n:'Aglio',q:3},{n:'Olio EVO',q:3},{n:'Peperoncino',q:0,qb:true},{n:'Prezzemolo fresco',q:3,soloLei:true}],
  proc:'Scalda la crema con i ceci dentro. Gamberi in padella con olio, aglio e peperoncino, 2 minuti per lato: fermati appena sono rosa. Sopra la crema, pane tostato a parte.',
  vincolo:{lei:'Prezzemolo tritato sopra.', lui:'Senza prezzemolo. Il resto è identico.'},
  nota:'A cena: aggiungi una focaccina o 50 g di pane ai semi (modulo +150).' },

{ id:'zup-orzo', nome:'Minestra di orzo, borlotti e verza con tacchino', tipo:'pranzo', cat:'zuppa', nuovo:true,
  tempo:10, difficolta:'facile',
  desc:'La minestra veneta d\'autunno. Il tacchino cuoce dentro, nel brodo.',
  ing:[{b:'orzoborlotti',q:350},{n:'Petto di tacchino',q:100},{n:'Grana grattugiato',q:5},{n:'Pepe nero',q:0,qb:true}],
  proc:'Scalda la minestra. Tacchino a dadini da 2 cm direttamente dentro, 6 minuti a fuoco medio: cuoce nel brodo e resta morbido. Grana e pepe sopra.',
  nota:'A cena: aggiungi una focaccina o 50 g di pane ai semi (modulo +150).' },

{ id:'zup-broccoli', nome:'Crema di broccoli e patate con merluzzo', tipo:'pranzo', cat:'zuppa', nuovo:true,
  tempo:10, difficolta:'facile',
  ing:[{b:'broccoli',q:400},{n:'Merluzzo (filetti)',q:180},{n:'Pane integrale',q:30},{n:'Olio EVO',q:5},
       {n:'Limoni',q:5},{n:'Aglio',q:3}],
  proc:'Scalda la crema. Merluzzo a pezzi da 4 cm adagiati nella crema che sobbolle, coperchio, 6 minuti: cuoce a vapore dentro la zuppa e non si asciuga. Olio a crudo, limone, pane tostato strofinato con l\'aglio.',
  nota:'A cena: aggiungi una focaccina o 50 g di pane ai semi (modulo +150).' },

{ id:'zup-carote', nome:'Crema di carote e lenticchie rosse con uova in camicia', tipo:'pranzo', cat:'zuppa', nuovo:true,
  tempo:10, difficolta:'media',
  ing:[{b:'carote',q:440},{n:'Uova',q:2},{n:'Semi di zucca',q:5},{n:'Aceto di riso',q:5}],
  proc:'Uova in camicia: acqua a leggero bollore con l\'aceto, crea il vortice col cucchiaio, uovo dentro, 3 minuti. Sulla crema calda, con i semi di zucca.',
  nota:'È il pranzo con meno proteine del catalogo (28 g): la cena di quel giorno sceglila da 50 g o più. A cena: aggiungi una focaccina o 50 g di pane ai semi (modulo +150).' },

{ id:'zup-harira', nome:'Harira e tacchino alla piastra', tipo:'cena', cat:'zuppa',
  tempo:40, difficolta:'media',
  desc:'Zuppa marocchina. Già conforme al vincolo per costruzione: cuoce 40 minuti e si disfa tutto. È la zuppa formato cena.',
  ing:[{b:'soffritto',q:120},{b:'ceci',q:80},
       {n:'Lenticchie rosse secche',q:30},{n:'Petto di tacchino',q:130},
       {n:'Passata di pomodoro',q:80},{n:'Brodo (o acqua)',q:250},
       {n:'Pane integrale',q:20},{n:'Zenzero fresco',q:4},
       {n:'Curcuma',q:2},{n:'Cannella',q:1},
       {n:'Limoni',q:10},{n:'Olio EVO',q:4}],
  proc:'Soffritto, spezie e olio in pentola, 2 minuti. Unisci lenticchie rosse, ceci, passata e brodo. 35 minuti a fuoco basso: le lenticchie rosse devono sparire e addensare la zuppa. Limone alla fine, a fuoco spento. Il tacchino a fette spesse, piastra rovente, 3 minuti per lato, tagliato a strisce sopra la zuppa.',
  nota:'Già conforme al vincolo. Nessuna variante.' },

/* ====================== PRANZI (450 kcal) ====================== */
{ id:'pra-chili', nome:'Chili con riso e pulled chicken', tipo:'pranzo',
  tempo:8, difficolta:'facile',
  desc:'Dalla base. Il pulled chicken porta le proteine che al chili da solo mancavano.',
  ing:[{b:'chili',q:200},{b:'riso',q:60},{b:'pulled',q:60},
       {n:'Yogurt greco 0%',q:40},{n:'Lime',q:10},
       {n:'Cipolla rossa',q:20,soloLei:true},{n:'Coriandolo fresco',q:5,soloLei:true}],
  proc:'Scalda chili e pulled chicken insieme in padella, non nel microonde: ci vogliono 5 minuti ma si asciuga e si concentra invece di diventare acquoso. Riso a fianco, non sotto.',
  vincolo:{lei:'Cipolla rossa cruda a fettine sottilissime, coriandolo spezzettato a mano, lime spremuto sopra alla fine.',
           lui:'Niente cipolla e niente coriandolo. Il lime va spremuto dentro il chili durante gli ultimi 2 minuti di cottura. Yogurt e una spolverata di peperoncino sopra.'},
  nota:'Il chili avanzato in freezer è il pasto di riserva della settimana in cui salta tutto.' },

{ id:'pra-ragu', nome:'Pasta al ragù fatto al coltello', tipo:'pranzo',
  tempo:12, difficolta:'facile',
  ing:[{b:'ragu',q:150},{n:'Pasta secca integrale',q:55},{n:'Grana grattugiato',q:8}],
  proc:'Scalda il ragù in padella larga. Scola la pasta 2 minuti prima del tempo e mantecala nel ragù con due cucchiai di acqua di cottura, 60 secondi a fuoco vivo. Grana fuori dal fuoco.' },

{ id:'pra-pasta-pollo', nome:'Pasta al pomodoro con pollo sfilacciato', tipo:'pranzo',
  tempo:15, difficolta:'facile',
  desc:'Il pasto più basico del catalogo: pasta, sugo, pollo. Tutto cotto e frullato, conforme per costruzione.',
  ing:[{b:'soffritto',q:100},{b:'pulled',q:100},
       {n:'Pasta secca integrale',q:40},{n:'Passata di pomodoro',q:50},
       {n:'Grana grattugiato',q:5},{n:'Peperoncino',q:0,qb:true}],
  proc:'Scalda soffritto e passata in padella larga, 8 minuti, finché non stringe. Unisci il pulled chicken e lascialo insaporire 5 minuti: si ammorbidisce e prende il sugo. Scola la pasta 2 minuti prima, mantecala nel sugo con un cucchiaio di acqua di cottura. Grana fuori dal fuoco.' },

{ id:'pra-lenticchie-polenta', nome:'Lenticchie, salsiccia di pollo e polenta', tipo:'pranzo',
  tempo:40, difficolta:'media',
  desc:'Già conforme al vincolo. La salsiccia sbriciolata dentro le lenticchie fa da condimento.',
  ing:[{b:'soffritto',q:80},{b:'lenticchie',q:130},{n:'Salsiccia di pollo o tacchino',q:50},
       {n:'Farina per polenta integrale',q:30},{n:'Acqua',q:150},
       {n:'Passata di pomodoro',q:40},{n:'Rosmarino',q:1},{n:'Alloro',q:1}],
  proc:'Polenta: acqua salata a bollore, farina a pioggia mescolando, poi 40 minuti a fuoco basso. Intanto la salsiccia spellata e sbriciolata rosola 4 minuti senza olio; unisci soffritto, rosmarino e alloro, poi lenticchie e passata, 12 minuti a fuoco basso. Devono restare umide, non asciutte.',
  nota:'Proteine sotto la media dei pranzi (25 g): abbinalo a una cena da 50 g o più.' },

{ id:'pra-shakshuka', nome:'Shakshuka con tre uova', tipo:'pranzo',
  tempo:15, difficolta:'media',
  desc:'Era una colazione: a pranzo, con tre uova, diventa un piatto vero.',
  ing:[{b:'soffritto',q:120},{n:'Passata di pomodoro',q:50},
       {n:'Uova',q:3},{n:'Feta',q:15},{n:'Pane integrale',q:15},
       {n:'Cumino',q:2},{n:'Paprika affumicata',q:2}],
  proc:'Cumino e paprika in padella asciutta 30 secondi. Unisci soffritto e passata, riduci 6-8 minuti finché non è densa: se è liquida le uova affondano. Scava gli incavi col dorso del cucchiaio, rompici dentro le uova, coperchio 5 minuti: l\'albume rappreso, il tuorlo ancora liquido. Feta sbriciolata sopra a fuoco spento.' },

{ id:'pra-pizzaiola', nome:'Uova alla pizzaiola', tipo:'pranzo',
  tempo:10, difficolta:'facile',
  desc:'Le uova affogate nel soffritto ridotto, con origano e peperoncino. Il pane serve a raccogliere, non a riempire.',
  ing:[{b:'soffritto',q:120},{n:'Uova',q:2},{n:'Albumi',q:3},
       {n:'Pane integrale',q:30},{n:'Olio EVO',q:4},
       {n:'Origano secco',q:1},{n:'Peperoncino',q:0,qb:true}],
  proc:'Scalda il soffritto in padella con l\'olio e l\'origano, 3 minuti, finché non si asciuga e comincia a sfrigolare ai bordi. Sbatti gli albumi con le uova intere e versali sopra. Non mescolare: copri e lascia rapprendere 4-5 minuti a fuoco medio-basso. Peperoncino sopra, pane tostato a parte.' },

{ id:'pra-burrito', nome:'Burrito di fagioli e uova', tipo:'pranzo',
  tempo:12, difficolta:'media',
  desc:'Si arrotola stretto e si scalda in padella asciutta finché non sigilla.',
  ing:[{b:'fagioli',q:60},
       {n:'Tortilla integrale media',q:1},
       {n:'Uova',q:2},
       {n:'Formaggio magro grattugiato',q:15},{n:'Passata di pomodoro',q:40},
       {n:'Cumino',q:2},
       {n:'Pomodoro fresco',q:40,soloLei:true},{n:'Coriandolo fresco',q:5,soloLei:true}],
  proc:'Schiaccia i fagioli con la forchetta, cumino e sale, scaldali 2 minuti. Strapazza le uova morbide in padella antiaderente senza olio, toglile dal fuoco quando sono ancora lucide. Farcisci la tortilla: fagioli, uova, formaggio, salsa. Arrotola stretto e rimetti in padella asciutta 90 secondi per lato, la chiusura sotto.',
  vincolo:{lei:'Salsa cruda: la passata con il pomodoro fresco a dadini e il coriandolo.',
           lui:'Stessa passata cotta in padella 8 minuti con un pizzico di cumino, poi frullata liscia.'} },

{ id:'pra-quesadilla', nome:'Quesadilla di fagioli e pulled chicken', tipo:'pranzo',
  tempo:12, difficolta:'media',
  ing:[{b:'fagioli',q:60},{b:'pulled',q:80},
       {n:'Tortilla integrale media',q:1},
       {n:'Formaggio magro grattugiato',q:25},
       {n:'Cumino',q:2},{n:'Paprika affumicata',q:1}],
  proc:'Schiaccia i fagioli con cumino e paprika. Spalma su metà tortilla, sopra il pulled chicken e il formaggio, piega a mezzaluna. Padella asciutta, fuoco medio, 3 minuti per lato con un peso sopra (un\'altra padella va bene): serve la pressione, altrimenti non sigilla e si sfalda al taglio. Aspetta 2 minuti prima di tagliarla.' },

{ id:'pra-orzotto', nome:'Orzotto alla zucca con straccetti di pollo', tipo:'pranzo', nuovo:true,
  tempo:35, difficolta:'media',
  desc:'La zucca si disfa nell\'orzo e lo manteca da sola: per lui è già passata.',
  ing:[{n:'Orzo perlato',q:50},{n:'Zucca',q:200},{b:'soffritto',q:50},{n:'Petto di pollo',q:100},
       {n:'Grana grattugiato',q:5},{n:'Olio EVO',q:3},{n:'Rosmarino',q:1},{n:'Brodo (o acqua)',q:300},{n:'Sale',q:0,qb:true}],
  proc:'Soffritto e rosmarino in pentola, 1 minuto. Orzo sciacquato e zucca a cubetti da 1 cm, brodo caldo poco per volta come un risotto, 25-30 minuti: la zucca deve disfarsi e legare. Grana fuori dal fuoco. Intanto il pollo a straccetti con sale e l\'olio, padella rovente, 3 minuti: sopra.' },

{ id:'pra-frittata', nome:'Frittata al forno di patate, porri e ricotta', tipo:'pranzo', nuovo:true,
  tempo:35, difficolta:'facile',
  desc:'Si fa in teglia, anche per 2-4 porzioni: fredda è buona anche il giorno dopo.',
  ing:[{n:'Uova',q:2},{n:'Albumi',q:3},{n:'Patate',q:80},{n:'Porri',q:80},{n:'Ricotta magra',q:50},
       {n:'Grana grattugiato',q:8},{n:'Olio EVO',q:4},{n:'Noce moscata',q:0,qb:true},{n:'Sale',q:0,qb:true}],
  proc:'Patate a fettine sottili e porri a rondelle stufati in padella con l\'olio e un dito d\'acqua, coperchio, 15 minuti: i porri devono disfarsi. Sbatti uova, albumi, ricotta, grana, noce moscata e sale; unisci le verdure. Teglia foderata, forno 180 °C per 20 minuti.',
  nota:'Per lui il porro va stufato fino a disfarsi: se resta a rondelle è fuori vincolo.' },

{ id:'pra-pasta-broccoli', nome:'Pasta con broccoli, ceci e tonno', tipo:'pranzo', nuovo:true,
  tempo:20, difficolta:'facile',
  desc:'I broccoli cuociono con la pasta e si schiacciano a crema: è la versione romana, quella "sfatta".',
  ing:[{n:'Pasta secca integrale',q:55},{n:'Broccoli',q:150},{b:'ceci',q:60},{n:'Tonno al naturale (sgocciolato)',q:80},
       {n:'Aglio',q:5},{n:'Olio EVO',q:4},{n:'Peperoncino',q:0,qb:true}],
  proc:'Broccoli a cimette nell\'acqua della pasta, 5 minuti prima di buttare la pasta: a fine cottura saranno sfatti. Aglio e peperoncino nell\'olio in padella, unisci ceci e tonno. Scola tutto insieme, salta in padella schiacciando i broccoli con il cucchiaio finché non fanno la crema.' },

{ id:'pra-falafel', nome:'Wrap di falafel', tipo:'pranzo', crudo:true,
  tempo:25, difficolta:'media',
  desc:'I falafel si infornano adesso: domenica hai preparato solo l\'impasto.',
  ing:[{b:'falafel',q:150},{b:'hummus',q:25},{b:'salsayogurt',q:40},
       {n:'Tortilla integrale media',q:1},{n:'Limoni',q:5},
       {n:'Pomodoro fresco',q:60},{n:'Cetriolo',q:50},{n:'Menta fresca',q:5}],
  proc:'Falafel in forno 200 °C per 20 minuti, girati a metà, su carta forno e spennellati d\'olio. Tortilla 20 secondi per lato. Hummus, salsa yogurt, i 3 falafel, pomodoro a dadini, cetriolo, menta, limone.',
  nota:'Pranzo da sola: le verdure crude non hanno una versione per lui. Proteine basse (20 g): abbinalo a una cena da 50 g o più.' },

{ id:'pra-hotdog', nome:'Hot dog di pollo con cipolle caramellate e insalata', tipo:'pranzo', crudo:true,
  tempo:12, difficolta:'facile',
  ing:[{b:'cipolle',q:40},{n:'Salsiccia di pollo o tacchino',q:100},
       {n:'Panino piccolo',q:1},{n:'Senape',q:8},
       {n:'Insalata mista',q:80},{n:'Pomodorini',q:60},
       {n:'Olio EVO',q:3},{n:'Aceto di riso',q:5}],
  proc:'Salsiccia in padella senza olio, fuoco medio, 10 minuti girandola spesso: deve abbrustolirsi, non bollire nel suo liquido. Pane tostato dalla parte del taglio. Cipolle caramellate scaldate, senape, salsiccia. Insalata e pomodorini a parte, olio e aceto.',
  nota:'Pranzo da sola. Proteine basse (25 g): abbinalo a una cena da 50 g o più.' },

{ id:'pra-farro-tonno', nome:'Insalata di farro con tonno, ceci, radicchio e mela', tipo:'pranzo', crudo:true, nuovo:true,
  tempo:30, difficolta:'facile',
  desc:'Il pranzo freddo d\'autunno: radicchio crudo e mela, quindi solo per te.',
  ing:[{n:'Farro perlato',q:45},{n:'Tonno al naturale (sgocciolato)',q:80},{b:'ceci',q:60},
       {n:'Radicchio',q:60},{n:'Mele',q:70},{n:'Noci',q:6},
       {n:'Olio EVO',q:3},{n:'Limoni',q:10},{n:'Aceto balsamico',q:5}],
  proc:'Farro 25 minuti in acqua salata, scolato e raffreddato sotto l\'acqua. Radicchio a strisce sottili, mela a dadini con il limone sopra (non annerisce), noci spezzettate. Tutto insieme con tonno, ceci, olio e balsamico.',
  nota:'Pranzo da sola. Si prepara anche la sera prima: il giorno dopo è più buono.' },

{ id:'pra-wrap-tacchino', nome:'Wrap di tacchino, hummus e feta con verdure crude', tipo:'pranzo', crudo:true, nuovo:true,
  tempo:5, difficolta:'facile',
  desc:'Zero cottura: il pranzo da sola dei giorni pieni.',
  ing:[{n:'Tortilla integrale media',q:1},{n:'Fesa di tacchino affettata',q:100},{b:'hummus',q:40},{n:'Feta',q:25},
       {n:'Insalata mista',q:40},{n:'Pomodoro fresco',q:60},{n:'Cetriolo',q:50}],
  proc:'Tortilla 20 secondi in padella. Hummus spalmato, fesa, feta sbriciolata, insalata, pomodoro e cetriolo a fette. Arrotola stretto.',
  nota:'Pranzo da sola.' },

/* ====================== CENE (600 kcal) ====================== */
{ id:'cen-spezzatino', nome:'Spezzatino di tacchino con zucca e piselli, e polenta', tipo:'cena', nuovo:true,
  tempo:45, difficolta:'media',
  desc:'La cena d\'autunno per definizione. La zucca si disfa nel sugo e lo lega.',
  ing:[{n:'Petto di tacchino',q:160},{n:'Zucca',q:200},{n:'Piselli surgelati',q:80},{b:'soffritto',q:100},
       {n:'Passata di pomodoro',q:60},{n:'Vino bianco',q:20},{n:'Farina per polenta integrale',q:35},{n:'Acqua',q:175},
       {n:'Olio EVO',q:4},{n:'Rosmarino',q:1},{n:'Alloro',q:1}],
  proc:'Tacchino a cubi da 3 cm, rosolato nell\'olio 3 minuti a fuoco alto. Sfuma col vino, unisci soffritto, passata, zucca a cubi, rosmarino e alloro, coperchio, 30 minuti a fuoco basso. Piselli negli ultimi 8. Polenta: acqua salata a bollore, farina a pioggia, 40 minuti a fuoco basso.',
  nota:'Per lui: dopo 30 minuti la zucca si disfa da sola; schiacciala con la forchetta nel sugo e diventa la crema che lega tutto. I piselli sono legumi: vanno bene interi.' },

{ id:'cen-teglia-pollo', nome:'Teglia di pollo e patate dolci, con crema di broccoli', tipo:'cena', nuovo:true,
  tempo:45, difficolta:'facile',
  desc:'Una teglia sola in forno e una pentola per i broccoli. Il resto lo fa il tempo.',
  ing:[{n:'Sovracosce di pollo disossate senza pelle',q:200},{n:'Patate dolci',q:200},{n:'Cipolle dorate',q:60},
       {n:'Broccoli',q:200},{n:'Yogurt greco 0%',q:30},
       {n:'Olio EVO',q:8},{n:'Aglio',q:5},{n:'Paprika affumicata',q:2},{n:'Rosmarino',q:1}],
  proc:'Sovracosce, patate dolci a cubi da 3 cm e cipolla a spicchi in teglia con olio, paprika, aglio, rosmarino e sale: 200 °C per 40 minuti, girando a metà. Broccoli 12 minuti in poca acqua, frullati con lo yogurt, sale e un filo d\'olio: una crema per tutti e due, a fianco.' },

{ id:'cen-polpette', nome:'Polpette di tacchino al sugo con purè di patate e zucca', tipo:'cena', nuovo:true,
  tempo:40, difficolta:'media',
  ing:[{n:'Macinato di tacchino',q:140},{n:'Ricotta magra',q:30},{n:'Pangrattato',q:8},{n:'Grana grattugiato',q:8},
       {n:'Albumi',q:1},{n:'Aglio',q:3},{n:'Prezzemolo fresco',q:3},
       {b:'soffritto',q:80},{n:'Passata di pomodoro',q:120},
       {n:'Patate',q:120},{n:'Zucca',q:100},{n:'Latte parzialmente scremato',q:30},{n:'Olio EVO',q:4},{n:'Noce moscata',q:0,qb:true}],
  proc:'Impasta macinato, ricotta, pangrattato, grana, albume, aglio grattugiato, prezzemolo tritato fine e sale; 20 minuti in frigo o si sfaldano. Polpette da 40 g, rosolate nell\'olio 4 minuti, poi soffritto e passata, coperchio, 15 minuti. Purè: patate e zucca bollite 20 minuti, schiacciate con il latte, noce moscata e sale.',
  nota:'Il prezzemolo è nell\'impasto e cuoce: va bene anche per lui.' },

{ id:'cen-radicchio', nome:'Sovracosce al forno con radicchio brasato e patate', tipo:'cena', nuovo:true,
  tempo:45, difficolta:'media',
  desc:'Il radicchio di Treviso brasato con l\'aceto balsamico: la cena veneta del catalogo.',
  ing:[{n:'Sovracosce di pollo disossate senza pelle',q:200},{n:'Radicchio',q:200},{n:'Patate',q:200},
       {n:'Cipolle dorate',q:40},{n:'Aceto balsamico',q:10},{n:'Olio EVO',q:8},{n:'Grana grattugiato',q:10},
       {n:'Rosmarino',q:1},{n:'Aglio',q:5}],
  proc:'Sovracosce e patate a cubi in teglia con metà olio, aglio, rosmarino e sale: 200 °C per 40 minuti. Intanto cipolla tritata nell\'altro olio 5 minuti; radicchio a strisce, aceto balsamico, sale, coperchio, 25 minuti a fuoco basso finché non si disfa. Grana sopra le patate negli ultimi 5 minuti di forno.',
  vincolo:{lei:'Radicchio brasato a strisce, così com\'è.',
           lui:'Il suo radicchio va frullato nel fondo di cottura fino a salsa: stesso sapore amaro-dolce, consistenza liscia.'} },

{ id:'cen-pollo-limone', nome:'Pollo al limone con purè di cavolfiore e patate', tipo:'cena', nuovo:true,
  tempo:35, difficolta:'facile',
  desc:'La cena con più proteine del catalogo: 57 g.',
  ing:[{n:'Petto di pollo',q:180},{n:'Cavolfiore',q:250},{n:'Patate',q:150},{n:'Latte parzialmente scremato',q:40},
       {n:'Grana grattugiato',q:10},{n:'Olio EVO',q:8},{n:'Limoni',q:15},{n:'Rosmarino',q:1},{n:'Aglio',q:5},{n:'Pane integrale',q:30}],
  proc:'Cavolfiore e patate bolliti insieme 20 minuti, frullati con latte, grana, metà olio e sale. Pollo a fette spesse un dito, padella rovente con l\'altro olio, aglio schiacciato e rosmarino, 3 minuti per lato; limone spremuto in padella a fuoco spento, un minuto a raccogliere il fondo. Pane a parte.' },

{ id:'cen-burger', nome:'Burger di manzo con cipolle caramellate e patate al forno', tipo:'cena', nuovo:true,
  tempo:35, difficolta:'facile',
  desc:'La cena "da sfizio" che sta nei conti: manzo magro, pane, patate al forno.',
  ing:[{n:'Manzo magro macinato',q:160},{n:'Panino piccolo',q:1},{b:'cipolle',q:40},{n:'Patate',q:130},
       {n:'Yogurt greco 0%',q:30},{n:'Senape',q:8},{n:'Olio EVO',q:3},{n:'Paprika affumicata',q:1}],
  proc:'Patate a spicchi con l\'olio, paprika e sale: 200 °C per 30 minuti. Burger da 160 g schiacciato a 2 cm, sale solo fuori, padella rovente 3 minuti per lato senza toccarlo. Pane tostato, yogurt mescolato con la senape, cipolle caramellate, burger.' },

{ id:'cen-pasta-forno', nome:'Pasta al forno con ragù, zucca e ricotta', tipo:'cena', nuovo:true,
  tempo:40, difficolta:'media',
  desc:'La zucca cotta e schiacciata nella ricotta fa lo strato cremoso: per lui è già passata.',
  ing:[{n:'Pasta secca integrale',q:45},{b:'ragu',q:160},{n:'Zucca',q:150},{n:'Ricotta magra',q:40},
       {n:'Formaggio magro grattugiato',q:25},{n:'Latte parzialmente scremato',q:30}],
  proc:'Zucca a cubetti 8 minuti al microonde, schiacciata con ricotta, latte e sale. Pasta scolata 3 minuti prima del tempo, mescolata al ragù. In teglia: pasta, crema di zucca, formaggio grattugiato sopra. 200 °C per 15 minuti, finché non gratina.',
  nota:'Proteine un po\' sotto la media delle cene (42 g): abbinalo a un pranzo da 35 g o più.' },

{ id:'cen-curry-sovracosce', nome:'Curry di sovracosce con spinaci, e vellutata a fianco', tipo:'cena',
  tempo:45, difficolta:'media',
  desc:'Brasate, non saltate. La vellutata di lenticchie rosse e zucca fa da contorno caldo.',
  ing:[{b:'soffritto',q:100},{b:'vellutata',q:200},
       {n:'Sovracosce di pollo disossate senza pelle',q:170},
       {n:'Spinaci freschi',q:150},{n:'Latte di cocco light',q:50},
       {n:'Olio EVO',q:4},{n:'Zenzero fresco',q:5},{n:'Aglio',q:5},
       {n:'Garam masala',q:3},{n:'Curcuma',q:2}],
  proc:'Taglia le sovracosce in pezzi da 4 cm. Rosolale nell\'olio a fuoco alto 4 minuti, tirale fuori. Nella stessa padella: zenzero, aglio, spezie, 40 secondi finché non profumano. Unisci soffritto e latte di cocco, rimetti il pollo, coperchio, fuoco basso, 35 minuti. Gli spinaci entrano negli ultimi minuti.',
  vincolo:{lei:'I suoi 150 g di spinaci vanno appassiti 40 secondi a fine cottura, restano foglia.',
           lui:'I suoi 150 g vanno cotti a parte 15 minuti e frullati dentro la salsa prima di rimettere il pollo. La salsa diventa verde scura e cremosa.'} },

{ id:'cen-gochujang', nome:'Riso e pulled chicken gochujang', tipo:'cena',
  tempo:8, difficolta:'facile',
  ing:[{b:'pulled',q:150},{b:'riso',q:140},
       {n:'Gochujang',q:25},{n:'Salsa di soia',q:10},
       {n:'Aceto di riso',q:8},{n:'Miele',q:5},{n:'Aglio',q:5},
       {n:'Olio di sesamo',q:3},{n:'Semi di sesamo',q:3},
       {n:'Cipollotto',q:15,soloLei:true},{n:'Kimchi',q:50,soloLei:true},
       {n:'Cipolle dorate',q:40,soloLui:true}],
  proc:'Mescola gochujang, soia, aceto, miele e aglio in una ciotola. Scalda il pulled chicken in padella rovente senza girarlo per 2 minuti, così alcune parti si abbrustoliscono. Versa la salsa, fai caramellare 90 secondi. Sesamo alla fine.',
  vincolo:{lei:'Cipollotto crudo a rondelle e kimchi a parte.',
           lui:'Niente kimchi: è fermentato ma crudo. Al suo posto 40 g di cipolla stufata 20 minuti con aceto di riso e peperoncino. Stessa funzione acida e piccante, consistenza morbida.'} },

{ id:'cen-kofta', nome:'Kofta di tacchino in salsa harissa, con bulgur', tipo:'cena',
  tempo:40, difficolta:'media',
  ing:[{b:'soffritto',q:120},{b:'salsayogurt',q:50},
       {n:'Macinato di tacchino',q:160},{n:'Bulgur',q:45},
       {n:'Harissa',q:10},{n:'Cumino',q:3},{n:'Menta secca',q:2},
       {n:'Aglio',q:5},{n:'Pangrattato',q:8},{n:'Olio EVO',q:3},
       {n:'Prezzemolo fresco',q:5,soloLei:true}],
  proc:'Impasta il macinato con cumino, menta secca, aglio, pangrattato e sale. Lascia riposare 20 minuti in frigo o le polpette si sfaldano. Forma cilindri allungati, rosolali nell\'olio 5 minuti girandoli. Aggiungi soffritto e harissa, coperchio, 15 minuti a fuoco basso. Bulgur: coprilo con acqua bollente pari al doppio del peso, coperchio, 15 minuti fuori dal fuoco.',
  vincolo:{lei:'Salsa yogurt con prezzemolo fresco tritato sopra.',
           lui:'Salsa yogurt liscia: è già fatta con menta secca, quindi va bene com\'è dal contenitore.'} },

{ id:'cen-chana', nome:'Chana saag con pollo', tipo:'cena',
  tempo:35, difficolta:'media',
  desc:'Curry di ceci e spinaci. Già conforme al vincolo: gli spinaci finiscono in crema per entrambi. Riproporzionato: la vecchia versione valeva più di 800 kcal reali.',
  ing:[{b:'soffritto',q:100},{b:'ceci',q:120},
       {n:'Petto di pollo',q:130},{n:'Spinaci freschi',q:200},
       {n:'Latte di cocco light',q:40},{n:'Yogurt greco 0%',q:40},
       {n:'Garam masala',q:3},{n:'Cumino',q:2},{n:'Zenzero fresco',q:5},{n:'Aglio',q:5},
       {n:'Olio EVO',q:3},{n:'Pane integrale',q:15}],
  proc:'Gli spinaci vanno cotti 15 minuti in pochissima acqua e frullati: diventano una crema verde densa. Intanto rosola il pollo a cubi, mettilo da parte. Nella stessa pentola: spezie, soffritto, ceci, latte di cocco, 10 minuti. Unisci la crema di spinaci e il pollo, altri 5 minuti. Yogurt fuori dal fuoco. Pane per raccogliere, al posto del riso.' },

{ id:'cen-thai', nome:'Curry thai rosso di gamberi', tipo:'cena',
  tempo:15, difficolta:'media',
  ing:[{b:'soffritto',q:80},{n:'Gamberi sgusciati',q:220},
       {n:'Riso jasmine',q:55},{n:'Latte di cocco light',q:80},
       {n:'Pasta di curry rosso thai',q:15},{n:'Salsa di soia',q:8},
       {n:'Lime',q:12},{n:'Zenzero fresco',q:5},
       {n:'Olio EVO',q:4},{n:'Basilico thai',q:5}],
  proc:'Friggi la pasta di curry nell\'olio per 60 secondi prima di aggiungere qualsiasi liquido: è il passaggio che separa un curry thai da acqua rossa. Poi soffritto, latte di cocco, zenzero, 8 minuti. I gamberi entrano per ultimi, 3 minuti e basta: oltre diventano gomma. Lime a fuoco spento.',
  vincolo:{lei:'Basilico thai fresco strappato sopra alla fine.',
           lui:'Il basilico va dentro la salsa negli ultimi 2 minuti di cottura, così cede l\'aroma senza restare foglia.'} },

/* ====================== EXTRA: moduli +150 e sfizi ====================== */
{ id:'ex-focaccina', nome:'Modulo +150 · una focaccina', tipo:'extra', nuovo:true,
  tempo:3, difficolta:'facile',
  desc:'Da aggiungere quando una zuppa da pranzo fa da cena, o nelle settimane senza nessuna eccezione.',
  ing:[{b:'focaccine',q:58}] },

{ id:'ex-pane', nome:'Modulo +150 · pane ai semi', tipo:'extra', nuovo:true,
  tempo:2, difficolta:'facile',
  desc:'Stessa funzione della focaccina: 50 g di pane ai semi tostato.',
  ing:[{b:'pane',q:50}] },

{ id:'ex-mela-cotta', nome:'Mela cotta alla cannella con yogurt greco', tipo:'extra', nuovo:true,
  tempo:6, difficolta:'facile',
  desc:'Il dolce che va bene anche per lui: la frutta è cotta.',
  ing:[{n:'Mele',q:150},{n:'Cannella',q:1},{n:'Yogurt greco 0%',q:100}],
  proc:'Mela a spicchi con la cannella, 4 minuti al microonde coperta (o 10 in padella con un dito d\'acqua). Yogurt sopra, tiepida.' },

{ id:'ex-skyr-cacao', nome:'Skyr e cacao', tipo:'extra',
  tempo:2, difficolta:'facile',
  desc:'Il modulo proteico: se un pranzo era povero di proteine, questo recupera 19 g con 115 kcal.',
  ing:[{n:'Skyr 0%',q:170},{n:'Cacao amaro',q:5},{n:'Cannella',q:1}] },

{ id:'ex-yogurt-arachidi', nome:'Yogurt greco e burro d\'arachidi', tipo:'extra',
  tempo:2, difficolta:'facile',
  ing:[{n:'Yogurt greco 0%',q:170},{n:'Burro d\'arachidi 100%',q:8}] },

{ id:'ex-cioccolato', nome:'Sfizio · cioccolato fondente 85%', tipo:'extra', nuovo:true,
  tempo:1, difficolta:'facile',
  desc:'La quota sfizio: 15 g, di rado. Non è un modulo, è un premio.',
  ing:[{n:'Cioccolato fondente 85%',q:15}] },
];

/* ---------- 4. Struttura e target ---------------------------------------- */
const TARGET = { kcal:1250, p:100, pasti:{ colazione:200, pranzo:450, cena:600 } };

// tipi = come conta nella giornata · categorie = come si presenta nel catalogo
// ordine di lavoro consigliato per domenica: forno (parte tutto insieme, è
// passivo) prima di fornelli, prima delle preparazioni a freddo (solo
// impasto/frullatore, nessuna cottura richiesta quella mattina); dentro ogni
// gruppo, tempo totale decrescente — si parte da chi corre più a lungo da
// solo, così passa mentre fai il resto.
const GRUPPI_BASI = ['forno', 'fornelli', 'freddo'];
GRUPPI_BASI
  .flatMap(g => BASI.filter(b => b.gruppo === g).sort((a,b) => b.tempoTot - a.tempoTot))
  .forEach((b, i) => { b.ordine = i + 1; });

const TIPI = [['colazione','Colazione'],['pranzo','Pranzo'],['cena','Cena'],['extra','Extra']];
const CATEGORIE = [
  ['colazione','Colazioni da forno'],
  ['zuppa','Zuppe e creme'],
  ['pranzo','Pranzi'],
  ['cena','Cene'],
  ['extra','Extra e sfizi'],
];

// nomi corti per i tag nelle schede
const BREVE = {soffritto:'soffritto', ceci:'ceci cotti', fagioli:'fagioli neri', borlotti:'borlotti',
  lenticchie:'lenticchie verdi', pulled:'pulled chicken', focaccine:'focaccine', pane:'pane ai semi',
  zucca:'crema di zucca', lentcavolo:'zuppa lenticchie', cavolfiore:'crema cavolfiore',
  orzoborlotti:'minestra orzo', broccoli:'crema broccoli', carote:'crema carote',
  muffin:'muffin mela', muffinzucca:'muffin zucca', plumcake:'plumcake', crackers:'crackers',
  chili:'chili', ragu:'ragù', vellutata:'vellutata', salsayogurt:'salsa yogurt',
  cipolle:'cipolle caram.', hummus:'hummus', falafel:'falafel', riso:'riso cotto'};
BASI.forEach(b => { b.breve = BREVE[b.id] || b.nome; if (!b.porz && !b.pezzi) b.porz = 0; });
PASTI.forEach(p => { if (!p.cat) p.cat = p.tipo; });

/* ---------- 5. Settimana tipo ---------------------------------------------
   Il pulsante "carica la settimana tipo" seleziona queste porzioni; la
   preparazione domenicale del documento è calcolata su questa selezione.
   Lei pranza da sola lunedì, mercoledì e venerdì; martedì e giovedì il pranzo
   è fuori (le due eccezioni realistiche della settimana); lui pranza fuori
   per lavoro dal lunedì al venerdì. Nel weekend si pranza insieme.
   ------------------------------------------------------------------------ */
const SETTIMANA_TIPO = {
  giorni:[
    {g:'Lunedì',    col:'col-muffin-skyr',      pra:'zup-zucca',      cena:'cen-spezzatino',   praPorz:1},
    {g:'Martedì',   col:'col-muffin-skyr',      pra:null,             cena:'cen-gochujang',    praPorz:0},
    {g:'Mercoledì', col:'col-muffin-skyr',      pra:'zup-zucca',      cena:'cen-pollo-limone', praPorz:1},
    {g:'Giovedì',   col:'col-muffin-skyr',      pra:null,             cena:'cen-polpette',     praPorz:0},
    {g:'Venerdì',   col:'col-focaccina-uovo',   pra:'zup-lenticchie', cena:'cen-teglia-pollo', praPorz:1},
    {g:'Sabato',    col:'col-focaccina-uovo',   pra:'zup-lenticchie', cena:'zup-harira',       praPorz:2},
    {g:'Domenica',  col:'col-focaccina-uovo',   pra:'pra-orzotto',    cena:'cen-burger',       praPorz:2},
  ],
};
// selezione {pastoId: porzioni} ricavata dalla tabella sopra (colazioni e cene ×2)
SETTIMANA_TIPO.sel = (() => {
  const s = {};
  const add = (id, n) => { if (id && n) s[id] = (s[id] || 0) + n; };
  SETTIMANA_TIPO.giorni.forEach(d => { add(d.col, 2); add(d.pra, d.praPorz); add(d.cena, 2); });
  return s;
})();

/* ---------- 6. Valori nutrizionali calcolati -------------------------------
   kcal/proteine per 100 g di ogni base (dagli ingredienti crudi, ricorsivo)
   e per porzione di ogni pasto. val = piatto di lei (con le finiture
   soloLei), valLui = piatto di lui (con le soloLui). Arrotondati a 5 kcal
   e a 1 g. Se una scheda mostra un solo numero, i due piatti sono uguali
   o quasi (differenza sotto i 15 kcal).
   ------------------------------------------------------------------------ */
function _grammi(nome, q){
  const m = ING[nome];
  if (!m) throw new Error('Ingrediente sconosciuto: ' + nome);
  return m.u === 'pz' ? q * (m.pz || 0) : q;
}
const _base100 = {};
function valoriBase100(id){
  if (_base100[id]) return _base100[id];
  const b = BASI.find(x => x.id === id);
  if (!b) throw new Error('Base sconosciuta: ' + id);
  let k = 0, p = 0;
  b.ing.forEach(([n, q]) => {
    if (n[0] === '@'){ const v = valoriBase100(n.slice(1)); k += v.k * q / 100; p += v.p * q / 100; }
    else { const g = _grammi(n, q); k += ING[n].k * g / 100; p += ING[n].p * g / 100; }
  });
  return _base100[id] = { k: k / b.resa * 100, p: p / b.resa * 100 };
}
function valoriPasto(pasto, chi){
  let k = 0, p = 0;
  (pasto.ing || []).forEach(i => {
    if (i.qb || !i.q) return;
    if (chi === 'lei' && i.soloLui) return;
    if (chi === 'lui' && i.soloLei) return;
    if (i.b){ const v = valoriBase100(i.b); k += v.k * i.q / 100; p += v.p * i.q / 100; }
    else { const g = _grammi(i.n, i.q); k += ING[i.n].k * g / 100; p += ING[i.n].p * g / 100; }
  });
  return [Math.round(k / 5) * 5, Math.round(p)];
}
BASI.forEach(b => { const v = valoriBase100(b.id); b.kcal100 = Math.round(v.k); b.p100 = Math.round(v.p * 10) / 10; });
PASTI.forEach(p => {
  if (p.valOverride){ p.val = p.valOverride; p.valLui = p.valOverride; return; }
  p.val = valoriPasto(p, 'lei');
  p.valLui = valoriPasto(p, 'lui');
});
