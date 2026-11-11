# Sudoku 3D — Especificació Funcional v1

**Data:** 2026-10-11  
**Última revisió:** 2026-10-12  
**Basat en:** [implementacio.md](implementacio.md)

---

## Llegenda d'estat

- ✅ **Implementat** — funcional al codi actual
- ⏳ **Pendent** — definit però no implementat
- 🚫 **Fora d'abast v1** — diferit a fases posteriors

---

## 1. Objectiu i abast

### 1.1 Descripció del producte

Joc de Sudoku tridimensional jugat sobre un cub `N×N×N` (3×3×3, 4×4×4 o 9×9×9). El jugador roda el cub amb el ratolí o el dit, selecciona cel·les i hi col·loca dígits. El target principal és **mòbil** (iOS i Android); l'escriptori és secundari.

### 1.2 Criteris de "fet" per a la v1

La v1 es considera acabada quan un jugador nou pot:

1. ✅ Obrir la pàgina, veure un puzzle de Novell generat i entendre la regla en 30 s sense llegir cap manual.
2. ✅ Completar-ne un, veure l'animació de victòria i la puntuació guardada.
3. ✅ Desbloquejar el nivell següent i notar el canvi visual.
4. ⏳ Tornar l'endemà i veure la ratxa i els rècords personals. *(rècords ✅, ratxa ⏳)*
5. ✅ Jugar tot amb teclat si ho vol.

### 1.3 Fora d'abast (v1)

- Rànquing en línia (backend).
- Multijugador asíncron.
- Editor de puzzles.
- Mode contra rellotge / supervivència.

---

## 2. Regles del joc

### 2.1 Regla base (modes 4×4×4 i 3×3×3)

✅ Cada **fila** (eix X), **columna** (eix Y) i **pilar** (eix Z) del cub ha de contenir els dígits `1..N` sense repetir. Total: `3·N²` restriccions.

### 2.2 Regla estesa (mode 9×9×9, opcional)

⏳ A més de files/columnes/pilars, cada **subcub 3×3×3** ha de contenir `1..9` sense repetir. Total addicional: 27 restriccions de subcub.

> **Nota d'implementació:** el generador actual no produeix solucions que satisfacin la restricció de subcub, per tant aquesta regla queda desactivada a la v1. El 9×9×9 utilitza únicament restriccions de fila/columna/pilar. L'efecte visual de cascada sí que s'activa quan un subcub 3×3×3 es completa sense conflictes de fila/columna/pilar.

### 2.3 Estats d'una cel·la

✅ Tots implementats: `fixed`, `empty`, `filled`, `conflict`, `note`.

---

## 3. Mides i dificultats

### 3.1 Mides suportades

| Mida | Dígits | Cel·les totals | Multiplicador de puntuació | Estat |
|---|---|---|---|---|
| 3×3×3 | 1–3 | 27 | 0.5× | ✅ |
| 4×4×4 | 1–4 | 64 | 1× | ✅ |
| 9×9×9 | 1–9 | 729 | 4× | ✅ |

### 3.2 Nivells de dificultat (referència 4×4×4)

| Nivell | Pistes 3³/4³/9³ | % ple | Ajudes | Mult. | Estat |
|---|---|---|---|---|---|
| **Novell** | 14/34/365 | ~50% | Notes + validació en viu + suggeriments | 1× | ✅ |
| **Experimentat** | 9/22/255 | ~35% | Notes + validació en viu | 2× | ✅ |
| **Avançat** | 6/14/160 | ~22% | Només notes, sense validació en viu | 4× | ✅ |
| **Expert** | 4/10/110 | ~15% | Sense ajudes | 8× | ✅ |

### 3.3 Progressió de nivells

- ✅ El jugador comença bloquejat a **Novell**.
- ✅ Completar **3 puzzles** d'un nivell desbloqueja el següent.
- ✅ L'estat de desbloqueig es guarda a `localStorage`.
- ✅ Botó per activar directament tots els nivells (des de preferències).

---

## 4. Requisits funcionals

### 4.1 Generació de puzzles

**RF-GEN-01** ✅ — El generador produeix puzzles amb **solució única** (per a N=3 i N=4). Per a N=9, límit de 3000 intents de retirada.

**RF-GEN-02** ✅ — Algorisme:
1. Genera una solució completa vàlida:
   - N=3, N=4: backtracking sobre permutació aleatòria.
   - N=9: construcció per permutació de bandes (molt més ràpid).
2. Retira cel·les una a una en ordre aleatori.
3. Comprova la unicitat de la solució després de cada retirada.
4. S'atura quan el nombre de pistes cau dins la finestra del nivell.

**RF-GEN-03** ✅ — El generador s'executa en un **Web Worker** (`generator.worker.js`). La UI mostra un spinner mentre genera.

**RF-GEN-04** ⏳ — Pre-generació de 5–10 puzzles per nivell a `IndexedDB`. *(pendent; ara es genera sota demanda via Worker)*

**RF-GEN-05** ✅ — Cada puzzle té una **llavor (seed)** `mulberry32`. URL compartible: `?seed=N&diff=ID`.

### 4.2 Càmera i navegació

**RF-CAM-01** ✅ — OrbitControls: arrossegar per rotar, roda del ratolí per zoom.

**RF-CAM-02** ✅ — Doble clic sobre una cara del cub → alinea la càmera amb aquella cara (normal de la cara × distància).

**RF-CAM-03** ✅ — `Ctrl+1..6` o `Numpad1..6` per a les sis vistes ortogonals.

### 4.3 Selecció de cel·la

**RF-SEL-01** ✅ — Clic simple (raycaster) per seleccionar una cel·la. Filtra les cel·les ocultes per slicing.

**RF-SEL-02** ✅ — Fletxes del teclat per moure la selecció en X/Y; PgUp/PgDn en Z.

**RF-SEL-03** ✅ — La cel·la seleccionada s'il·lumina i destaca la seva fila, columna i pilar amb tint suau.

### 4.4 Introducció de valors

**RF-VAL-01** ✅ — Botons `1..N` al HUD (reconstruïts dinàmicament quan canvia N).

**RF-VAL-02** ✅ — Teclat numèric (tecles `1..N`).

**RF-VAL-03** ✅ — `Backspace` / `Delete` / `0` per esborrar el valor d'una cel·la.

**RF-VAL-04** ✅ — Tecla `N` o tap llarg → activa el mode notes. Candidats en miniatura sobre la cara de la cel·la (graella 2×2 per N≤4, 3×3 per N=9).

### 4.5 Ajudes i eines

**RF-AJ-01** ✅ — `H` — Pista: revela una cel·la correcta a l'atzar. Cost: −50 punts. Comptador al readout (H).

**RF-AJ-02** ✅ — `V` — Validar: flash vermell sobre totes les cel·les en conflicte. Cost: −10 punts. Comptador al readout (V).

**RF-AJ-03** ✅ — `Ctrl+Z` / `Ctrl+Shift+Z` — Desfer / Refer. Historial complet de la partida.

**RF-AJ-04** ✅ — Botó **"Mostra la solució"** — revela la solució, la partida no compta com a victòria.

### 4.6 Validació en viu

**RF-VIV-01** ✅ — Cada canvi recalcula els conflictes de totes les línies afectades. Cost `O(N)` per canvi.

**RF-VIV-02** ✅ — Cel·les en conflicte: vora vermella + icona `!` sobre el número.

**RF-VIV-03** ✅ — Als nivells **Avançat** i **Expert** la validació en viu es desactiva per defecte.

### 4.7 Detecció de victòria

**RF-VIC-01** ✅ — Comprova si totes les cel·les estan plenes i sense conflictes després de cada canvi.

**RF-VIC-02** ✅ — Overlay de victòria amb temps, errors, puntuació, rècord personal (nou rècord destacat en accent), missatge de desbloqueig si escau, i botó "Puzzle nou".

---

## 5. Puntuació i persistència

### 5.1 Fórmula de puntuació

✅ Implementada:

```
puntuacio_base   = 1000 · multiplicador_dificultat · multiplicador_mida
bonus_temps      = max(0, temps_objectiu - temps_real) · 5
penalitzacions   = pistes_usades · 50 + errors · 20 + validacions · 10
puntuacio_final  = max(0, puntuacio_base + bonus_temps - penalitzacions)
```

`multiplicador_mida`: 3³ = 0.5×, 4³ = 1×, 9³ = 4×.

### 5.2 Estadístiques guardades

| Dada | Emmagatzematge | Estat |
|---|---|---|
| Preferències (volum, mida HUD, moviment reduït, alt contrast) | `localStorage` | ✅ |
| Nivells desbloquejats | `localStorage` | ✅ |
| Millor temps per nivell | `localStorage` | ✅ |
| Millor puntuació per nivell | `localStorage` | ✅ |
| Rànquing top-10 per nivell | `localStorage` | ✅ |
| Puzzle en curs (estat serialitzat per reprendre) | `localStorage` | ⏳ |
| Historial de les últimes 50 partides | `IndexedDB` | ⏳ |
| Caché de puzzles pre-generats | `IndexedDB` | ⏳ |
| Ratxa actual (dies consecutius) | `localStorage` | ⏳ |

**RF-PER-01** ✅ — Exportar / importar tota la persistència com a JSON.

**RF-PER-02** ✅ — Reiniciar-ho tot amb diàleg de confirmació previ.

### 5.3 Rànquing local

**RF-RAN-01** ✅ — Taula top-10 per nivell, ordenada per puntuació. Accessible des de preferències. Guardada a `localStorage` (clau `ranking` dins `sudoku3d.v1`).

### 5.4 Repte diari

**RF-DIA-01** ✅ — Puzzle diari amb llavor derivada de la data (`dateHash(YYYY-MM-DD)`). Accessible des de preferències → "Repte del dia".

---

## 6. Requisits no funcionals

### 6.1 Rendiment

**RNF-REND-01** ✅ — Objectiu 60 fps; generació en Web Worker per no bloquejar.

**RNF-REND-02** ✅ — `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

**RNF-REND-03** ✅ — Qualitat adaptativa: si `fps < 45` durant 2 s, desactiva bloom. Si `fps > 55` durant 5 s, restaura bloom.

**RNF-REND-04** ✅ — Cache de textures `{tipus:valor:color:tema:N} → CanvasTexture`. `clearTextureCache()` en canviar mida o tema.

### 6.2 Accessibilitat

**RNF-ACC-01** ✅ — Conflictes indicats per color (vora vermella) i per icona `!` (suport daltonisme).

**RNF-ACC-02** ✅ — Tot el joc és jugable sense ratolí (fletxes + números + tecles de vista).

**RNF-ACC-03** ✅ — Mida de text del HUD ajustable via slider (×0.8–×1.4). CSS var `--hud-scale`.

**RNF-ACC-04** ✅ — Tema "Alt contrast" (blanc/groc/verd sobre negre, sense bloom) activable des de preferències.

**RNF-ACC-05** ✅ — Reducció de moviment: desactiva partícules, tweens i efectes visuals. S'activa automàticament si `prefers-reduced-motion` és actiu.

### 6.3 Controls tàctils (mòbil)

**RNF-TAC-01** ✅ — Un dit arrossegant → rotar el cub (OrbitControls).

**RNF-TAC-02** ✅ — Pinça → zoom (OrbitControls).

**RNF-TAC-03** ✅ — Tap curt → seleccionar (llindar < 8 px per distingir tap de drag).

**RNF-TAC-04** ✅ — Tap llarg (500 ms) → activa mode notes per aquella cel·la.

**RNF-TAC-05** ✅ — Swipe amunt des de la vora inferior (últims 40 px, > 50 px de recorregut) → obre/tanca preferències.

### 6.4 HUD adaptatiu

**RNF-HUD-01** ✅ — Botons `1..N` amb mida mínima 44×44 pt.

**RNF-HUD-02** ✅ — Àrees segures respectades (`env(safe-area-inset-*)` per notch i barra inferior d'iOS).

**RNF-HUD-03** ✅ — Landscape + alçada < 500 px: pad vertical a la dreta de la pantalla.

### 6.5 Hàptics

**RNF-HAP-01** ✅ — `navigator.vibrate()` en seleccionar cel·la (15 ms), col·locar dígit correcte (30 ms), error (patró), victòria (patró llarg).

**RNF-HAP-02** ⏳ — Haptic feedback natiu via Capacitor plugin a iOS. *(pendent fase 6)*

---

## 7. Estètica i efectes

### 7.1 Temes per nivell

✅ Tots implementats:

| Nivell | Tema | Accent |
|---|---|---|
| Novell | *Cristall matí* | Taronja `#c27a25` |
| Experimentat | *Neó nit* | Rosa `#e04a9d` |
| Avançat | *Obsidiana* | Daurat `#d8a040` |
| Expert | *Plasma* | Vermell `#e05c3a` |
| — | *Alt contrast* | Groc `#ffff00` |

### 7.2 Efectes durant el joc

| Esdeveniment | Efecte | Estat |
|---|---|---|
| Hover sobre cel·la (escriptori) | Aixeca la cel·la 0.05 u | ✅ |
| Col·locar dígit correcte | Flash blanc + escala 1→1.1→1 | ✅ |
| Col·locar dígit erroni | Shake + vora vermella | ✅ |
| Completar una línia (fila/col/pilar) | Cascada daurada | ✅ |
| Completar un bloc 3×3×3 (N=9) | Cascada de pulsos | ✅ |

### 7.3 Animació de victòria

✅ Implementada: cascada de pulsos des del centre, rotació automàtica del cub, explosió de partícules amb física i fade, overlay de resultats.

### 7.4 Post-processing

✅ `EffectComposer` + `UnrealBloomPass` (intensitat per tema). Desactivat automàticament si fps < 45.

---

## 8. Àudio

**RF-AUD-01** 🚫 — Música ambient de fons. *(eliminada per decisió de disseny: no s'inclourà)*

**RF-AUD-02** ✅ — SFX: col·locar dígit, esborrar, error, línia completada, victòria, canvi de selecció.

**RF-AUD-03** ✅ — Web Audio API. Slider de volum SFX. Tecla `M` per silenciar.

**RF-AUD-04** ✅ — Sons generats amb oscil·ladors (Web Audio API).

---

## 9. Arquitectura i distribució

### 9.1 Stack tecnològic

✅ Implementat:
- **Render:** Three.js 0.160 + JS pur (ES modules, importmap, sense build step).
- **Generació:** Web Worker (`generator.worker.js`).
- **Persistència:** `localStorage` (prefs, progrés, rànquing). `IndexedDB` pendent.
- **App nativa:** Capacitor ⏳ (fase 6).

### 9.2 Estructura de fitxers actual

```
sudoku3d/
├── index.html
├── src/
│   ├── main.js
│   ├── game/
│   │   ├── grid.js             # N dinàmic (let N, setN)
│   │   ├── generator.js        # backtracking N=3/4, permutació N=9
│   │   ├── generator.worker.js # Web Worker
│   │   ├── validation.js       # conflictes fila/col/pilar
│   │   ├── difficulty.js       # cluesPerSize {3,4,9}, getClues()
│   │   ├── scoring.js          # sizeMult 0.5/1/4×
│   │   ├── history.js
│   │   ├── notes.js
│   │   └── timer.js
│   ├── render/
│   │   ├── scene.js            # addAxesHelper, updateAxesHelper
│   │   ├── cells.js            # getOffset(), cache textures, notes N×N
│   │   ├── themes.js           # 4 temes + contrast
│   │   ├── effects.js          # flash, pulse, lineCascade, subcubeCascade, victory
│   │   ├── hud.js              # setInfo, rebuildNumberPad, showRanking
│   │   └── slicing.js          # rebuildSliceUI, createSlicer
│   ├── input/
│   │   ├── pointer.js          # doble clic, tap llarg
│   │   ├── keyboard.js         # V valida, Ctrl+1-6 vista, H hint
│   │   └── swipe.js            # swipe des de vora inferior
│   ├── audio/
│   │   └── audio.js
│   ├── persist/
│   │   └── prefs.js            # getRanking, addToRanking, exportAllData
│   └── util/
│       ├── prng.js
│       ├── haptic.js           # navigator.vibrate
│       └── tween.js
├── .agents/specs/
│   ├── especificacio.md        # aquest fitxer
│   └── implementacio.md
└── assets/
```

### 9.3 Distribució

⏳ Fase 6: Capacitor iOS/Android, AdMob, stores.

---

## 10. Riscos oberts

| Risc | Estat | Mitigació |
|---|---|---|
| Rendiment generador N=9 | ✅ Mitigat | Web Worker + construcció per permutació de bandes |
| Llegibilitat 3D N=9 (cel·les ocultes) | ✅ Mitigat | Panel de slicing per eix (rebuildSliceUI) |
| Restricció de subcub N=9 | ⏳ Diferit | Generador no suporta subcubs; desactivat a v1 |
| Ús de memòria textures N=9 | ✅ Mitigat | Cache compartit per clau {tipus, valor, color, tema, N} |
| Rebuig App Store per contingut insuficient | ⏳ Pendent | Tots els nivells, rànquings i reptes diaris presents |
