# Sudoku 3D — Document d'implementació

## 1. Visió del projecte

Un joc de **Sudoku tridimensional** jugat sobre un cub `N×N×N` (per defecte 4×4×4, ampliable a 3×3×3 i 9×9×9 amb subcubs). El jugador roda el cub amb el ratolí, selecciona cel·les i hi col·loca dígits. L'objectiu és fer un joc pulit, satisfactori i "premium" — no un exercici tècnic — amb progressió, retroalimentació visual rica i un llaç curt de recompensa.

El [mockup existent](../sudoku3d.html) serveix com a prova tècnica de la renderització i selecció; aquest document defineix el joc complet a construir a partir d'ell.
Segueix sempre les normes de l'espec que està a .agents/specs/especificacio.md

## 2. Regles del joc

**Regla base (mode 4×4×4 i 3×3×3):** cada **fila** (eix X), **columna** (eix Y) i **pilar** (eix Z) del cub ha de contenir els dígits `1..N` sense repetir. Són `3·N²` restriccions.

**Regla estesa (mode 9×9×9, opcional):** a més de files/columnes/pilars, cada **subcub 3×3×3** ha de contenir 1..9 sense repetir (27 subcubs).

**Estat d'una cel·la:**
- `fixed` — pista inicial, no editable.
- `empty` — buida.
- `filled` — omplerta pel jugador (correcta o no).
- `conflict` — el valor actual trenca alguna restricció (calculat en viu).
- `note` — el jugador hi ha marcat candidats (mode notes).

## 3. Dificultats

Les dificultats controlen **quantes cel·les surten prefixades** i **l'estil visual/ambiental**. Números orientatius per a 4×4×4 (64 cel·les totals):

| Nivell | Pistes | % ple | Notes/ajudes | Descripció |
|---|---|---|---|---|
| **Novell** | 32–36 | ~50% | Notes + validació en viu + suggeriments | Introductori, marca conflictes immediatament |
| **Experimentat** | 20–24 | ~35% | Notes + validació en viu | Estàndard |
| **Avançat** | 12–16 | ~22% | Només notes, sense validació en viu | Requereix planificació |
| **Expert** | 8–12 | ~15% | Sense ajudes | Per a completistes |

Per a 9×9×9 les mateixes proporcions escalen (~365 pistes a Novell, ~110 a Expert de 729 cel·les).

**Progressió:** el jugador comença bloquejat a Novell. Completar 3 puzzles d'un nivell desbloqueja el següent. Els nivells desbloquejats es guarden a `localStorage`. però si el jugador va a preferències i desbloqueja tots els nivells se li han de desbloquejar tots perquè pugui jugal amb el nivell que vulgui. Si recupera una partida iniciada anteriorment i que va finalitzar i ara vol tornar-hi, el nivell ha de ser el que tenia la partida.

## 4. Generador de puzzles

Peça central i la més delicada del projecte. Objectiu: puzzles amb **solució única**.

**Algorisme:**
1. **Genera una solució completa vàlida** amb backtracking sobre una permutació aleatòria de cel·les i dígits.
2. **Retira cel·les una per una** en ordre aleatori.
3. Després de cada retirada, comprova que el puzzle segueix tenint **solució única** (segon backtracking que es para quan troba la segona solució).
4. Para quan el nombre de pistes cau dins la finestra del nivell demanat, o quan qualsevol retirada addicional trencaria la unicitat.

**Rendiment:** generar en un `Web Worker` per no bloquejar la UI, amb un timeout i un caché de puzzles pre-generats per nivell (5–10 puzzles per nivell guardats a `IndexedDB`) perquè començar sigui instantani. Regenera en segon pla mentre el jugador juga.

**Llavor (seed):** cada puzzle té una llavor derivada del PRNG (per exemple `mulberry32`). Permet compartir puzzles per URL (`?seed=abc123&level=advanced&size=4`).

## 5. Interacció

**Càmera:**
- OrbitControls (arrossegar per rotar, roda per zoom).
- Doble clic sobre una cara del cub → alinea la càmera amb aquella cara ("vista frontal", "superior", etc.).
- Tecles `1..6` per a les sis vistes ortogonals.

**Selecció de cel·la:**
- Clic simple (raycaster).
- Fletxes del teclat per moure la selecció al veí en X/Y/Z. `Shift+fletxa` per canviar l'eix "cap endins/enfora".
- La cel·la seleccionada s'il·lumina i **destaca la seva fila, columna i pilar** amb un tint suau (opció desactivable).

**Introducció de valors:**
- Botons `1..N` al HUD.
- Teclat numèric.
- `Backspace` / `Delete` / `0` per esborrar.
- `N` (o clic dret sobre cel·la) → mode notes; els números introduïts en aquest mode s'afegeixen com a candidats petits en comptes de valor final.

**Ajudes:**
- `H` — pista: revela una cel·la correcta a l'atzar (cost: penalització de temps).
- `V` — validar: marca totes les cel·les en conflicte durant 2s.
- `U` / `Ctrl+Z` — desfer. `Ctrl+Shift+Z` — refer. Historial complet.
- Botó **"Solucionar"** — trencament: mostra la solució, no compta com a victòria.

## 6. Validació en viu

Cada canvi de valor recalcula els conflictes de la cel·la editada **i** de les seves fila/columna/pilar/subcub. Cost `O(N)` per canvi. Cel·les en conflicte pinten la vora en vermell pulsant.

A nivells alts (Avançat, Expert) la validació en viu es pot desactivar per obligar el jugador a autocomprovar-se.

## 7. Puntuació i estadístiques

**Càlcul de puntuació per partida:**

```
puntuacio_base = 1000 · multiplicador_dificultat · multiplicador_mida
bonus_temps = max(0, temps_objectiu - temps_real) · 5
penalitzacions = pistes_usades · 50 + errors · 20 + validacions · 10
puntuacio_final = max(0, puntuacio_base + bonus_temps - penalitzacions)
```

`multiplicador_dificultat`: Novell 1×, Experimentat 2×, Avançat 4×, Expert 8×.
`multiplicador_mida`: 3×3×3 = 0.5×, 4×4×4 = 1×, 9×9×9 = 4×.

**Estadístiques guardades (localStorage / IndexedDB):**
- Millor temps per (mida, nivell).
- Millor puntuació per (mida, nivell).
- Puzzles completats totals.
- Ratxa actual (dies consecutius amb almenys una partida acabada).
- Historial de les últimes 50 partides (temps, puntuació, data, llavor).

**Rànquing local:** taula top-10 per nivell, exportable com a JSON. Sense servidor per la v1 (afegible més tard).

**Reptes diaris:** un puzzle amb llavor derivada de la data (`hash(YYYY-MM-DD)`) igual per a tothom. Comparteix codi al final.

## 8. Estètica per nivell

Cada nivell té una **paleta i material** propis, perquè el jugador vegi progressió visual:

| Nivell | Tema | Cel·les buides | Cel·les plenes | Ambient |
|---|---|---|---|---|
| Novell | *Cristall matí* | vidre blau clar translúcid | blau pastel amb número blanc | fons cel gradient, llum suau |
| Experimentat | *Neó nit* | translúcid violeta | fúcsia amb glow | fons negre, bloom moderat |
| Avançat | *Obsidiana* | negre translúcid amb reflex | negre metàl·lic amb número dorat | fons carbó, llum dura |
| Expert | *Plasma* | quasi invisible, només arestes | vidre iridescent amb número que canvia de matís | fons animat, partícules |

Implementació: cada tema és un objecte `{ background, materials: {empty, filled, fixed, selected, conflict}, postFX: [...] }` intercanviable en runtime.

## 9. Efectes especials

**Durant el joc:**
- **Hover**: la cel·la sota el cursor s'aixeca lleument (0.05 unitats) amb tween.
- **Col·locar dígit correcte**: petit flash blanc + escala 1→1.1→1 en 200ms.
- **Col·locar dígit erroni**: sacsejada (shake) de la cel·la i vora vermella pulsant.
- **Completar una línia (fila/columna/pilar)**: les 4/9 cel·les d'aquella línia fan un pols daurat en cascada.
- **Completar un subcub** (mode 9×9×9): el subcub sencer rota 360° una vegada.

**En completar el puzzle:**
- Totes les cel·les emeten un pols de color arc de sant Martí en cascada des del centre cap enfora.
- El cub sencer rota lentament mostrant totes les cares.
- Explosió de partícules (500–1000 sprites amb física simple, gravetat i fade).
- So d'èxit + música de victòria breu.
- Overlay amb temps, puntuació, rècord personal (si aplica), botons "Nou puzzle", "Compartir", "Rànquing".

**Post-processing:** `EffectComposer` amb `UnrealBloomPass` (intensitat depenent del tema), `SMAAPass` per antialias, opcionalment `FilmPass` a Expert.

## 10. Àudio

- Música ambient de fons per nivell (loops curts, canviables), volum baix per defecte.
- SFX: col·locar dígit, esborrar, error, línia completada, victòria, canvi de selecció.
- Tot amb la Web Audio API. Sliders de música/SFX independents. `M` per silenciar.

Els sons són curts i no crítics — la primera versió pot usar samples generats (oscil·ladors) i afegir samples reals més tard.

## 11. Accessibilitat

- **Daltonisme**: els conflictes no s'indiquen només per color, també per una icona `!` a la cel·la.
- **Teclat complet**: tot es pot jugar sense ratolí (fletxes + números + tecles de vista).
- **Mida de text ajustable** al HUD.
- **Mode alt contrast** com a tema addicional.
- **Reducció de moviment**: opció que desactiva rotacions, partícules i tweens llargs (`prefers-reduced-motion` per defecte).

## 12. Mòbil / tàctil (ciutadà de primera)

L'objectiu és publicar a **Google Play** i **App Store** com a apps natives-empaquetades, no com a web. El mòbil és el target principal; l'escriptori és secundari.

**Controls tàctils:**
- Un dit arrossegant → rotar el cub.
- Pinça → zoom.
- Tap curt sobre cel·la → seleccionar (llindar de moviment <8px per distingir tap de drag).
- Tap llarg → obrir el mode notes ràpid per aquella cel·la.
- Swipe des de la vora inferior → obrir menú de puzzles / preferències.

**HUD adaptatiu:**
- Botons `1..N` grans (mínim 44×44pt segons guies iOS) a la part inferior, en filera o graella segons `N`.
- Àrees segures (`env(safe-area-inset-*)`) respectades — notch i barra inferior d'iOS.
- Orientació: portrait i landscape, HUD es reorganitza (botons a la dreta en landscape).

**Rendiment mòbil:**
- Objectiu: **60 fps a gama mitjana** (iPhone SE 2020, Pixel 6a).
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — mai més de 2×.
- Bloom i partícules amb qualitat adaptativa: si `fps < 45` durant 2s, degrada automàticament (menys partícules, sense bloom).
- Textures de dígits compartides (cache global) — imprescindible a 9×9×9.
- Sense hover-lift (no existeix el hover); substituït per pulse suau a la cel·la seleccionada.

**Vibració hàptica:**
- `navigator.vibrate([20])` a col·locar dígit (Android).
- Haptic feedback natiu via Capacitor plugin a iOS (impact light/medium segons esdeveniment).

## 13. Empaquetat i distribució (Play Store / App Store)

**Stack recomanat: [Capacitor](https://capacitorjs.com/)** (de l'equip d'Ionic).

Raons:
- Empaqueta la web app existent com a app nativa iOS + Android sense reescriure res.
- Plugins oficials per: In-App Purchases, AdMob, notificacions, hàptics, Game Center / Play Games Services, compartir.
- Web view modern (WKWebView / Chrome custom tabs) amb WebGL2 → Three.js va perfecte.
- Alternativa: Cordova (més vell, evitar) o React Native + `react-three-fiber` (reescriure tot el render, no compensa).
- Alternativa "seriosa": exportar a **Unity** o **Godot**. Descartat per la v1 — massa canvi per un joc que ja funciona a web.

**Estructura afegida:**

```
sudoku3d/
├── android/                    # projecte Android Studio generat per Capacitor
├── ios/                        # projecte Xcode generat per Capacitor
├── capacitor.config.ts
├── dist/                       # build web que Capacitor empaqueta
└── ... (la resta igual)
```

**Requisits per publicar:**

*Google Play:*
- Compte Google Play Console: **25 USD un cop**.
- APK/AAB signat, mínim `targetSdk` = 34 (actualment).
- Fitxa: icona, feature graphic, 2–8 captures, vídeo opcional, descripció curta/llarga.
- Política de privacitat (URL pública obligatòria si es fan servir ads o analítiques).
- Formulari de "Data safety" declarant què es recull.
- Revisió: hores–dies.

*App Store:*
- Compte Apple Developer: **99 USD/any**.
- Cal un Mac amb Xcode per fer builds i pujar (o servei tipus Codemagic/EAS).
- App Store Connect: mateixes fitxes que Play + preview iPad si es suporta.
- Política de privacitat + "App Privacy" declarat.
- Revisió humana d'Apple: 1–7 dies típicament, més estricta. Rebutgen apps trivials, així que cal que el joc tingui contingut real (els nivells, rànquings, reptes diaris ajuden a passar).

**Nom i identificador:** reserva ja `com.<eltellinatge>.sudoku3d` (o similar) a les dues stores abans de posar-hi molta feina en branding.

## 14. Monetització

Aquesta és una decisió estratègica important. Els tres models viables per un puzzle indie:

### Opció A — Gratuït amb anuncis (recomanat per començar)

**Com funciona:** l'app és gratis. Els ingressos venen de mostrar anuncis via **Google AdMob** (funciona a iOS i Android).

**Tipus d'anuncis a integrar:**
1. **Rewarded video** (el pilar): el jugador el mira voluntàriament a canvi d'una pista, un intent extra, saltar un puzzle, o desbloquejar temporalment un tema. **eCPM alt (10–30 €)** i no molesta. És on es fa la majoria dels diners.
2. **Interstitial** (pantalla completa): entre puzzles, no més d'un cada 3–5 partides. Molesta si abuses.
3. **Banner**: petit banner a peu de pantalla fora del joc (menús, resultats). Guanya poc però constant. Molts jocs premium el treuen per no embrutar la UI.

**Ingressos realistes:** amb 1.000 usuaris actius diaris que veuen 3 rewarded/dia i 2 interstitials: ~30–80 €/mes. **Escala amb usuaris, no amb temps.** El model és de volum: cal molta gent.

**Pros:** barrera d'entrada zero → moltes més descàrregues. Aprens mètriques reals (retenció, engagement) abans de decidir res més.

**Contres:** ingressos petits fins a milers d'usuaris. Cal complir GDPR (banner de consentiment via Google UMP SDK). Alguns jugadors ho odien.

### Opció B — Premium (venda directa)

**Com funciona:** preu únic (típic 1,99–4,99 €), sense ads.

**Ingressos realistes:** 1.000 vendes a 2,99 € = ~2.100 € net (les stores es queden 30% el primer any, 15% després per subscripcions, però la majoria del joc paga 30% sempre). Sona bé, però **vendre 1.000 còpies d'un joc indie desconegut és difícil**. Les mètriques de conversió de "vist a la store" a "compra" són molt baixes (< 1%).

**Pros:** experiència neta, jugador content, no cal moderar res.

**Contres:** poques descàrregues → poc boca-orella → poca visibilitat als rànquings de la store → menys descàrregues. Cicle difícil de trencar sense màrqueting.

### Opció C — Freemium (recomanat a mig termini)

Combinació: gratis amb ads + opció de compra única "**Premium**" (~2,99–4,99 €) que:
- Treu tots els anuncis per sempre.
- Desbloqueja tots els nivells i temes des del principi.
- Dona una icona d'app dorada / marc especial al perfil (petit prestigi visual).

Aquest model és el **més rentable a la pràctica** per jocs de puzzle: els *whales* (jugadors invertits) paguen, la resta segueix gratis i genera dades i ads. Conversió típica 2–5% dels jugadors actius → si tens 10.000 DAU, 200–500 compradors ≈ 400–1.500 € un cop, més els ads recurrents.

També pots afegir microtransaccions consumibles (paquets de "pistes", monedes per saltar puzzles), però afegeixen complexitat i tenen fama de predatòries per un puzzle solitari. **Evitar a la v1.**

### Recomanació concreta

1. **v1 llançament: Opció A (només ads)** amb rewarded ads ben integrats + 1 interstitial cada 4 puzzles + sense banner (o molt discret). Objectiu: aconseguir descàrregues i mesurar retenció.
2. **v1.1 (2–3 mesos després): passar a Opció C** afegint la compra "Premium". Els usuaris que ja hi juguin són els primers candidats.
3. Considerar Opció B només si tens una audiència ja construïda (streaming, xarxes) o el joc rep una empenta editorial.

**No fer subscripcions** per un puzzle sense contingut nou constant — és un frau al jugador i les stores hi són cada cop més durs.

### Requisits legals per monetitzar

- **Política de privacitat** publicada a una URL (n'hi ha prou amb GitHub Pages). Obligatòria per ads.
- **Consentiment GDPR/CCPA**: usa Google UMP SDK (ve amb AdMob) — mostra el diàleg de consentiment automàticament segons regió.
- **App Tracking Transparency (iOS 14.5+)**: cal mostrar el prompt `Permetre seguiment?`. Els usuaris que diguin que no fan baixar l'eCPM d'ads dràsticament.
- **Declaracions a les stores**: "conté anuncis", "compres dins de l'app", categories de dades recollides. Ser honest — Apple i Google auditen.
- **IVA i fiscalitat**: les stores gestionen l'IVA UE, però els ingressos són renda que has de declarar. A Espanya cal donar-se d'alta com a autònom si superes ingressos regulars (o via ETT / soc. limitada segons volum).

## 15. Persistència

## 13. Persistència

`localStorage`:
- Preferències (tema, volum, mida per defecte, mode notes, animacions reduïdes).
- Nivells desbloquejats.
- Rècords per (mida, nivell).
- Puzzle en curs (estat serialitzat) per reprendre-ho.

`IndexedDB`:
- Historial de partides.
- Caché de puzzles pre-generats.

Botó a preferències per **exportar/importar** tota la persistència com a JSON, i per **reiniciar-ho tot** amb confirmació.

## 16. Arquitectura del codi

El mockup és un únic HTML. La v1 es reorganitza així:

```
sudoku3d/
├── index.html
├── src/
│   ├── main.js                 # bootstrap, loop de render
│   ├── game/
│   │   ├── grid.js             # estat lògic N×N×N, validació
│   │   ├── generator.js        # generador de puzzles + solucionador
│   │   ├── generator.worker.js # generador en Web Worker
│   │   ├── scoring.js          # càlcul de puntuació
│   │   └── history.js          # undo/redo
│   ├── render/
│   │   ├── scene.js            # escena, llum, càmera
│   │   ├── cells.js            # meshes de cel·les, textures
│   │   ├── themes.js           # paletes i materials per nivell
│   │   ├── effects.js          # partícules, tweens, post-FX
│   │   └── hud.js              # overlay DOM
│   ├── input/
│   │   ├── pointer.js          # clic/tacte/raycaster
│   │   └── keyboard.js         # dreceres
│   ├── audio/
│   │   └── audio.js            # música + SFX
│   ├── persist/
│   │   ├── prefs.js            # localStorage
│   │   └── db.js               # IndexedDB
│   └── util/
│       ├── prng.js             # mulberry32 amb llavor
│       └── tween.js            # tweens petits sense dependència
├── assets/
│   ├── audio/
│   └── fonts/
├── documents/
│   └── implementacio.md
└── sudoku3d.html               # mockup original (referència)
```

Sense framework — Three.js + JS pur. Sense pas de build a la v0; migració a Vite si l'arbre creix.

## 17. Roadmap per fases

**Fase 0 — refactor del mockup**
Passar el mockup a l'estructura de mòduls d'amunt sense canviar la funcionalitat. Fita: el joc actual funciona igual, però amb els fitxers separats.

**Fase 1 — nucli jugable**
- Generador amb solució única (4×4×4).
- Validació en viu + marcatge de conflictes.
- Detecció de victòria + overlay bàsic.
- Undo/redo.
- Teclat.

**Fase 2 — progressió**
- Els quatre nivells de dificultat.
- Puntuació + cronòmetre.
- Persistència de rècords a localStorage.
- Desbloqueig progressiu de nivells.

**Fase 3 — estètica i feedback**
- Sistema de temes per nivell.
- Efectes: hover-lift, flash de col·locació, cascada de línia completada.
- Animació de victòria + partícules + post-processing (bloom).

**Fase 4 — àudio i polit**
- Música per nivell + SFX complets.
- Preferències, accessibilitat, mode reducció de moviment.
- Mode notes / candidats.

**Fase 5 — extensions**
- Mida 3×3×3 i 9×9×9 amb subcubs.
- Repte diari amb llavor de data.
- Compartir puzzle per URL.
- Rànquing local top-10.

**Fase 6 — empaquetat mòbil**
- Integrar Capacitor, generar projectes iOS/Android.
- Controls tàctils com a ciutadans de primera + hàptics.
- Àrees segures, orientacions, qualitat adaptativa.
- Beta interna a TestFlight (iOS) i Internal Testing (Play).

**Fase 7 — llançament i monetització**
- AdMob integrat (rewarded + interstitial, sense banner o discret).
- Política de privacitat publicada, UMP SDK per consentiment.
- Fitxes de store (captures, vídeo, descripció) en català/castellà/anglès.
- Llançament a Play (soft launch) → App Store.
- Analítiques mínimes (retenció D1/D7, sessions).

**Fase 8 — més enllà**
- Rànquing en línia (backend petit).
- Multijugador asíncron (mateix puzzle, comparar temps).
- Editor de puzzles.
- Mode contra rellotge / supervivència.

## 18. Riscos i decisions obertes

- **Rendiment del generador a 9×9×9**: 729 cel·les amb comprovació d'unicitat pot ser lent. Mitigació: caché pre-generat + Web Worker + acceptar puzzles quasi-únics amb un límit d'intents.
- **Llegibilitat 3D a mides grans**: un cub 9×9×9 té 729 cel·les i moltes queden ocultes darrere. Solució: mode "tallar per capes" (mostrar només la capa Z=k, amb slider) i cel·les molt més transparents per defecte.
- **Corba de dificultat de la validació en viu**: si sempre és activa, el joc esdevé trivial. Per això s'apaga a partir d'Avançat.
- **Ús de memòria de les textures de dígits**: una textura canvas per cel·la a 9×9×9 = 729 textures. Solució: cache compartit `{value, temaId} → texture` reutilitzable entre cel·les.

## 19. Criteris de "fet"

La v1 es considera acabada quan un jugador nou pot:
1. Obrir la pàgina, veure un puzzle de Novell generat, entendre la regla en 30s sense llegir manual.
2. Completar-ne un, veure l'animació de victòria i la seva puntuació guardada.
3. Desbloquejar el nivell següent i notar el canvi visual.
4. Tornar l'endemà i veure la seva ratxa i rècords.
5. Jugar tot amb teclat si vol.
