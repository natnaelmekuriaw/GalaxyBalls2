# MASTER DEVELOPMENT PROMPT — Galaxy Balls–inspired smartphone remake

You are a senior mobile game engineer, 2D technical artist, game designer, QA lead, and release engineer. **Build a complete, playable, polished, offline-first smartphone puzzle game inspired by the original Nokia Java ME game _Galaxy Balls_** (circa late 2000s), retaining its recognizable mechanics, pacing, character-driven progression, and charming retro-space presentation while improving touch controls, readability, smoothness, sound, and device compatibility.

## 0. Non-negotiable rules

1. **Implement the game, not just a design or static mockup.** Write working source files, assets, tests, and build instructions; run and fix what your environment can run. Provide a playable browser build during development if available and Android build/export instructions, with iOS-ready architecture where feasible.
2. This is a **falling-block match-three game, NOT conventional Tetris**. Three or more adjacent blocks of the same color in a straight horizontal, vertical, or either diagonal direction are cleared. Do not clear a full row merely because it is full.
3. **Classic 6-column × 10-row playfield** (6 across, 10 high), a **3×3 next-piece preview**, falling groups starting with **2 blocks** and later introducing **3-block pieces**. Larger 4-block pieces are a user recollection, but **not independently verified**: implement them in the configurable piece system without enabling them in strict Classic mode until confirmed.
4. The small flying character to the right is a **reactive mascot/level indicator**, not confirmed as an AI opponent. It responds to matches and changes as difficulty rises. Do not invent an opponent board or battle AI.
5. Include **normal colored blocks**, **dark heavy stone blocks**, and three confirmed special single-cell falling pieces: **bomb**, **flash**, and **star**. Preserve their distinct effects (see below).
6. Nostalgic, **2D, readable pixel-art / crisp sprite aesthetics**, not a generic glossy neon or 3D block puzzler. Preserve the feeling of an early-2000s Nokia color-screen game, without intentionally recreating its poor input response or painfully slow early game.
7. Use **original, legally safe** character art, sprites, sound, text, title and logo for public release. _Galaxy Balls_ and Nokia are identification/reference names, not permission to redistribute Nokia art, audio, code, or branding. Use a working title such as **Orbit Blocks: Retro Galaxy** until a final original name is chosen. Don't pull unrelated online sprites or copy another remake's assets.
8. **No fabricated fidelity claims.** If something cannot be determined from sources, mark it `UNVERIFIED` and isolate it in configurable settings. Do not silently claim exact scoring, colors, frame timing, spawn frequencies, mascot roster, rotation direction, or block geometry.
9. Prefer existing supported project tools if a project already exists. Otherwise, use **Godot 4.x / GDScript** for native 2D mobile work. If the coding environment can't build Godot projects, use **Phaser 3 + TypeScript + Vite** with **Capacitor** for Android/iOS packaging. Choose **one** stack; don't mix unnecessary frameworks or add a backend. Ensure deterministic, testable grid logic separate from rendering.
10. Do not stop after writing a plan. **Build in working stages**; report precisely what was built and what remains unverified or untested.

## 1. Reference research — consult before implementing if internet access exists

Primary historical sources:
- Detailed hands-on review of Galaxy Balls installed on a Nokia 2330 Classic, including rules, controls, board size, characters, special blocks, vibration, and sounds: https://hirudov.com/misc/Nokia2330Classic.php (see **Games > Galaxy Balls**).
- Original game listing and a gallery with 3 screenshots: https://www.uvlist.net/game-170643-Galaxy%2BBalls . Listed as a Nokia-published Java ME single-player falling-block match-three game; the precise listed year is tentative.
- Original gameplay footage, video 1: https://www.youtube.com/watch?v=QvI4b04SanI
- Original gameplay footage, video 2: https://www.youtube.com/watch?v=fCskbVQbcxM
- Additional Galaxy Balls gameplay footage (Chinese title): https://www.bilibili.com/video/BV1or4y147ur/
- Community archive with an in-game Galaxy Balls instruction screen: https://t.me/s/nokiasgames?q=%23official

Modern comparisons **for UX research only, not copied assets or assumed original mechanics**:
- Forgotten Brick Game: https://play.google.com/store/apps/details?id=com.rickrip.game0 (developer explicitly describes an independent game inspired by Galaxy Balls)
- SupaBlock: Match3 Drop Puzzle: https://play.google.com/store/apps/details?id=com.mossgreenman.supaBlock (described as inspired by Galaxy Balls and Nature Park)

If the tool can open reference images/videos, inspect them and write a short **Reference Fidelity Matrix** with columns `Feature | Verified behavior | Visual evidence / source | Confidence | Implementation | Open question` before making graphics. Examine title screen, dark space colors, planet placement, sprite scale, flying mascot's size and idle expression, HUD, side preview, block style, grid dimensions, movement, power-up icons, level transitions, sounds, and game-over flow. **If web/video access is unavailable, do not pretend you watched it**: proceed using the verified description below and preserve open questions for later screenshot-based refinements.

## 2. Historically documented core gameplay

A. A game begins with an **empty 6×10 cell grid**. A small **3×3 next-piece preview** adjoins the playfield. Blocks fall under gravity. The player moves and rotates the currently falling connected group to create matches while preventing the grid from filling to the top. Difficulty increases in an ongoing survival run; save local high scores (original showed five records).

B. **Match condition:** 3 or more **contiguous cells of identical normal color** in any one of four axes: horizontal `(1,0)`, vertical `(0,1)`, diagonally down-right `(1,1)`, diagonally down-left `(-1,1)`. Both diagonal slopes count. Simultaneously clear every qualifying match, unique-cell counting if lines intersect. Let unsupported blocks **fall under gravity**, scan again, and continue until the board is stable, producing cascade combos. Match-three is not adjacency-cluster matching: an L-shaped connected cluster that contains no straight run of 3 should not clear. A two-cell line must not clear.

C. **Pieces:** Earliest stages use connected groups of 2 cells; 3-cell groups appear later. Configurable arrangements/colors. The source refers to increasingly varied pieces as levels rise. Do not assume standard seven Tetris tetrominoes. Support rotations with grid collision checking, preserving all cells and their colors. Whether original rotation also cycles colors within a vertical piece is **unverified**: implement the transform as a swappable strategy and default to actual 90° geometry rotation if using non-linear shapes. Track any divergence in documentation. Support 4-cell shapes behind a disabled `experimentalFourBlockPieces` flag.

D. **Historical keypad controls:** `4` or left = move left; `6` or right = move right; `5` or `8` or down = move piece vertically/down faster; `2` or up = rotate. Some model layouts use SELECT/DOWN for vertical movement and UP for rotate. The review notes holding the horizontal key did not repeat on the original; for strict Classic mode, support individual steps; the modern alternative may allow key repeat. Do not add **hard drop as the only way to play**.

E. **Stones:** dark/black heavy stone cells are obstacles. **Three matching stones do not clear**. The reviewed version says they are removable using a bomb or a flash. Stone landing produces a stronger impact/haptic effect. Make stone piece distribution increase with difficulty, but keep exact probabilities data-driven.

F. **Single-cell special pieces** (verified effect category, with unverified finer geometry explicitly adjustable):
  - **Bomb:** upon landing, destroys **nearby surrounding cells**, including stones. Default to the adjacent 8-cell neighborhood around impact, with the bomb's own cell consumed; `bombRadius = 1` is a **proposed approximation**, not confirmed exact.
  - **Flash:** upon landing, destroys the **entire column it lands in**, including stones, consuming itself. The clearing animation should sweep clearly along the column.
  - **Star:** upon landing, removes the **same type/color of ordinary blocks as the cell it contacts** from the grid (global color clear). The precise target acquisition is **ambiguous** in the historical description; default to the cell directly below at impact, or adjacent touched normal-color cell if below is unavailable. Make target-selection logic easily replaceable and never delete stones with star unless a source confirms that behavior.
  - After any special action, settle columns and resolve matches/cascades using the same shared deterministic engine. Do not incorrectly turn these into paid, manually selected power-up buttons: in Classic mode, they arrive as falling **pieces**.

G. **Mascots and progression:** A **small animated yellow flying space creature** appears in the original introduction/game. After matches it shows satisfaction (e.g. closes eyes); at thresholds it flies away and another cute character flies into its place, communicating an increase in difficulty. The mascot should be visually noticeable on the right but not obstruct the playfield. Its changing expression is feedback, not combat. Add several **original** space-creature designs with comparable charm; only assert the first yellow flying mascot as documented. As levels advance, fall speed and piece complexity increase, and stone/special pieces appear more often according to configurable, bounded probabilities.

H. **Presentation and sound:** Intro/title is space-themed with **three planets, stars, and the animated yellow flying creature** in the historical description. There is a short intro tune; in-game audio was sparse (block land/clear). Preserve restrained retro audio rather than nonstop aggressive soundtrack. Stone landing had vibration. Combo flashes/chain count appear during consecutive clears.

I. **Game over:** When the playfield reaches the top such that a new piece cannot be validly spawned, the run ends. Apply this exact deterministic spawn-collision condition; don't kill the player just because a settled block occupies an upper cell if a legal spawn remains. High-score table stores top five results locally. Exact old score formula and threshold values are **not verified**.

## 3. Product design / modes

Implement these screens: **title screen** with recognizable retro-space atmosphere; **main menu** (Play, How to Play, High Scores, Settings); **play screen**; **pause/settings overlay**; **game-over summary** (score, level, combos, retry, menu); **first-run tutorial** with interactive short lessons; optional **Credits / Inspiration** with attribution to historical reference without implying affiliation.

Two gameplay presets sharing one core engine:
- **Classic Remastered (DEFAULT):** exact 6×10 board, historical match-three rules and pieces, simple mascot sequence, manual single-step left/right, move-down and rotate, restrained effects, no hold/ghost/hard drop by default, endless survival, power-ups as falling pieces. Do not add artificial timers, lives, player upgrades, versus AI, row-clearing, currencies, ads, or a level-map to this mode.
- **Modern Comfort (OPTIONAL):** still 6×10 and same matching/obstacle rules, but faster initial pace, improved continuous horizontal repeat, optional hard drop/ghost piece, flexible touch gestures, clearer visual cues, ergonomic controls, adjustable motion/speed and colorblind support. These options must be individually toggleable; modern defaults must not quietly change Classic behavior.
- **Practice / tutorial:** optionally permit slow speed and repeatable example boards. Practice runs should not overwrite Classic leaderboards.

## 4. Detailed core engine specification

Architecture (adapt names to chosen engine):
```
GameConfig
GameState / StateMachine
GridModel (6 x 10, no graphics dependencies)
Piece / PieceFactory / PieceQueue
MovementAndCollision
RotationStrategy
GravityAndLocking
MatchResolver
CascadeResolver
SpecialBlockResolver
DifficultyDirector
ScoreManager
InputMapper
Renderer / Animations
MascotController
AudioHaptics
Persistence
TutorialController
```

Data models: `Cell = Empty | Normal(colorId) | Stone | Bomb | Flash | Star`; each `Piece = {cells:[{dx,dy,kind,colorId?}], pivot, x,y, type}`; board as `10 rows × 6 columns` with top-left `(0,0)` and increasing y downward. Active falling piece is **not inserted into settled grid until lock**. Use deterministic seeded PRNG in logic for reproducible testing and gameplay replays. Store level, elapsed time, fall timer, move repeat timers, score, multiplier/cascade depth, next-piece preview, difficulty config, mascot identity, game status, and selected mode. Validate state transitions `MENU → PLAYING → LOCKING → RESOLVING → SPAWNING → GAME_OVER`, with `PAUSED` interrupting simulation without losing timers.

**Piece tick and lock:** fixed-timestep simulation (e.g. 60Hz logical ticks) independent of display FPS. Spawn new group at a valid location near top center; use collision detection against boundaries and occupied settled cells. Apply gravity at a tunable interval; move down only when all cells fit; if blocked, lock piece (allow a small configurable lock grace period in Comfort mode; strict Classic may lock immediately). Resolve landing-triggered specials, scan normal-color matches, animate synchronous clear, apply per-column downward gravity, repeat until no matches, update score/level/mascot, spawn next. Keep state logic authoritative and animation nonblocking and interruptible (pause/resume). Skip/resume effects without duplicate clears. No physics engine is needed for grid collisions.

**Special piece landing:** determine impact/contact location before destroying anything; distinguish directly landed special from specials inside settled board; avoid duplicate activation if the same special is encountered multiple times in one resolve pass. Stone is not a color. Conclude a special's own landing effects before standard colored matching and cascades. Treat unresolved cases consistently and add tests; do not create unbounded loops or leave holes after gravity.

**Proposed tunable defaults — not claimed as historical:** 4 visually distinct normal colors initially; unlock a 5th only if playtesting demands it. Fall interval initially ~1100 milliseconds in Classic and ~750 milliseconds in Comfort, gradually reduced to a floor of ~250 milliseconds, without unfair step jumps. Promote 3-block pieces after ~15-25 placements or an equivalent score threshold; introduce hazards gradually; transition mascot with each major level. Special and stone spawn chances controlled by per-level weighted tables and a fairness cap that prevents long impossible hazard streaks. Prefer documented fidelity and empirical playtesting over these temporary values. Put all tuning in one human-readable configuration file.

**Scoring:** retain a configurable formula because the original exact formula is unknown. Proposed: `base = 10 × countOfDistinctNormalCellsCleared`, multiply by a cascade factor (e.g., `1 + 0.5 × (chainDepth - 1)`); award sensible explicit points for cells removed by bomb/flash/star while avoiding double-counting. Display brief combo label for successive cascades. **Document that this is a new scoring formula** and keep classic score rules replaceable.

## 5. Visual direction / art production

Art goal: **faithful mood, modern execution**. Use pixel art or crisp low-resolution 2D sprites drawn at a consistent logical resolution (e.g. base art 160×240 or another practical design space) and scale with integer-ish nearest-neighbor rendering where appropriate. Smooth text/UI may render at native device resolution. Avoid noisy effects, giant glassmorphism panels, extraneous gradients, ads, animated confetti that obscure the board, and generic Tetris visuals.

- Theme: deep navy/indigo space, softly twinkling stars, three distant planets on the intro, clean colorful planet/gem-like square cells, dark textured stone squares, readable colored symbols, simple highlights and outlines. Colors are **creative choices pending screenshot comparison**, not claimed exact.
- Board: 6-column × 10-row **square-cell** grid with thin understated border; ensure active piece visibly distinct from settled pieces. Show the next-piece preview in an adjacent **3×3** framed window. Maintain enough visual room for the mascot on the right or upper-right.
- Piece art: bright, distinct normal colors with subtle tile textures; dark/charcoal stone with cracks/heavy appearance; bomb marked by a clear explosion glyph; flash with a vertical lightning bolt; star with a star-shaped icon. Glyphs and shape/textures must convey meaning to colorblind users.
- Mascot system: at least 4 **original** sprite characters for difficulty milestones, starting with a cute small yellow hovering figure; each has idle hover/bob/blink, satisfied eyes-closed animation on a match, excited reaction to combos, alarm near top-out, fly-away/fly-in transition for difficulty change. Do not copy identifiable original Nokia character pixel-for-pixel.
- HUD: score, current level, next 3×3 preview, compact pause icon, optionally chain message. No mascot or text overlay blocking active cells. Typography recalls old handset games but is readable at modern densities. Phone safe areas respected.
- Effects: gentle pop for matches (100–180ms), subtle gravity settle, 2–3 frame classic sparkle, a short vertical beam for flash, local radial burst for bomb, tasteful global shimmer for star, brief haptic impact for stone. Screen shake minimal and disableable.
- Menus: evocative retro pixel frames and space elements, quick transitions under ~300ms, responsive portrait layout. Make title playful and original.

## 6. Touch, keyboard, device behavior

PRIMARY: portrait mobile, **one-hand comfortable**. Provide a fixed **bottom control strip** with four large thumb-safe targets `◀ / ▶ / ↻ / ▼`, minimum 48dp effective touch targets (prefer around 56–64dp with adequate spacing). `▼` supports hold to accelerate downward in Comfort mode; in Classic preserve down-step or conservative soft-drop consistent with documentation. No control may cover board cells. Allow simultaneous left/down or rotate/down where meaningful; prevent double-tap and stale pointer actions. Provide subtle pressed feedback and optionally haptics.

ALTERNATE: configurable swipe controls—swipe left/right one or multiple grid units, tap or swipe up rotate, swipe down soft drop. Default to the explicit button strip for reliable, easy-to-learn play. Do **not** couple piece x-coordinate directly to finger x-coordinate in a way that teleports through blocked cells. Optional Comfort-only hard drop must be a clearly separate gesture/button.

Keyboard/gamepad testing: Left/Right move, Up rotate, Down soft-drop, `Space` or Enter optional Comfort hard-drop, Escape/P pause. Mouse clickable on web development build. Ensure consistent game speed across refresh rates, no browser-page scroll during gestures, no pinch-zoom, no accidental back navigation, insets/notches handled, backgrounds save/pause automatically, audio/haptics respect device settings.

## 7. Audio and accessibility

Generate/provide your own short intro melody (retro 8-bit inspired; no copied theme), quiet UI click, gentle move tick, tile landing pop, normal-clear blip, cascading higher-pitched chime, bomb burst, flash zip, star sparkle, stone heavy thud with optional stronger haptic, stage/mascot transition flourish, game-over tone. Separate Music/SFX/Haptics sliders/toggles. Music during gameplay should be off by default or soft/optional to honor the mostly silent original. All sounds work offline and respect mute / background audio behavior.

Accessibility: distinguish tiles by unique glyph/texture **as well as color**; high-contrast theme, toggle excessive flash/shake, larger touch controls, sound/haptic off options, readable text, settings retained across restarts. Avoid requiring internet, sign-in, analytics SDKs, microtransactions, or ads.

## 8. Persistence, packaging, performance

- Persist top **five local high scores** with dates and player-entered short aliases; separate Classic, Comfort, and Practice (practice unranked). Save audio/control/accessibility settings and optionally autosave an ongoing run on pause/app background. Use local storage suited to chosen engine, versioned schema, handle corrupted data gracefully.
- Runs start within a few seconds, maintain smooth **60fps rendering on typical phones** with deterministic gameplay; render only visible sprites/effects, avoid excessive allocations each frame. Support Android portrait resolutions and device densities; iOS portrait layout too if packaging is feasible.
- Produce organized source, any original sprite/audio assets, README, license information, build/export instructions and **Android APK/AAB if the environment supports compilation**; if unavailable, do not claim an APK was produced—provide commands and tested web demo if possible.

## 9. Testing — mandatory executable cases

Implement unit tests against the **pure grid model** and manual gameplay smoke tests. Minimum assertions:
1. Horizontal, vertical, down-right diagonal, and down-left diagonal straight runs of 3 identical normal cells clear; runs of 2 don't.
2. Groups of 4+ clear; overlapping matches deduplicate positions, scoring once per cell.
3. Same-color L-shape with no straight line of 3 does **not** clear.
4. Simultaneous independent matches clear in one wave; gaps fall straight downward per column; subsequent matches trigger a counted cascade.
5. Stones never clear solely through matching, even 3+ together; bomb/flash can destroy stones.
6. Bomb destroys defined nearby neighborhood **and itself**; flash removes all cells in impact column including stones; star removes the selected ordinary color globally and not stones (pending authentic target behavior confirmation).
7. Specials don't trigger twice, don't cause infinite resolve loops, and don't leave invalid board states.
8. Piece cannot exit board or overlap occupied cells; rotation near borders/collisions is safe; 2-cell pieces early, 3-cell pieces at higher stage; 4-cell mode disabled in Classic until verified.
9. When next piece cannot legally spawn, game ends once; score saved once; clear space at top does not trigger premature defeat.
10. Level progression changes falling speed / piece weights / mascot identity without restarting or clearing the current board.
11. Pause stops gravity, input and animation timers; resume preserves game; backgrounding app pauses safely.
12. Portrait display at small (~360×640dp) and tall (~1080×2400px) sizes keeps the entire 6×10 board, 3×3 preview, mascot, HUD and controls legible without clipping or overlap.
13. Controls work with tapping, rotating, soft-drop, and optional swipe scheme; no accidental hard drop in Classic.
14. High-score top-five sorting and persistence survive reload; settings survive app restarts; no network required.
15. Check visually against available original screenshots/video for grid, piece art, mascot presence, special sprites and sense of pacing. Record **differences** instead of declaring exact fidelity without verification.

## 10. Build execution order — perform, don't just describe

**Phase 0, research and decisions:** read original references when accessible; make Fidelity Matrix with `VERIFIED / INFERRED / PROPOSED / UNVERIFIED`; choose one supported tech stack; record assumptions and separate core/modern features.

**Phase 1, playable vertical slice:** create project; implement 6×10 grid, next preview, spawn/fall/move/rotate/collision/lock, matching in 4 directions, gravity, cascades and top-out; render basic readable temporary art. **Immediately run it** with keyboard and clickable touch controls.

**Phase 2, original specials and progression:** stone, bomb, flash, star, stage/difficulty curve, changeable mascots, scoring, preview queue, game over, local top five. Test each rule with forced fixtures and deterministic seeds.

**Phase 3, game look and feel:** replace placeholders with coherent original retro-space sprite pack; title with three planets, polished grid/HUD/preview; mascot 4+ animations; sound and haptics; visual effects; preserve simple nostalgia.

**Phase 4, smartphone optimization:** big bottom touch buttons, portrait scaling, insets, safe gestures, pause/background/resume, accessibility, different screen sizes, 60fps target, mobile build path.

**Phase 5, completion:** implement title/menu/tutorial/settings/game-over/high scores; fix defects found by tests; produce screenshot(s) from actually running game; verify a sample full round; document unavoidable differences and unverified old details. Build/install/export as tool support permits.

## 11. Acceptance criteria / what you must deliver

- **Playable end-to-end**: launch → game/menu → falling piece → multiple matches + cascade → special block → mascot level change → game over → saved high score → retry.
- Matches are **color-based in 4 straight axes**, not completed-row Tetris clearing.
- 6×10 grid, 3×3 next preview, 2-cell initial groups, 3-cell later groups, stone plus three correct special kinds.
- A cute right-side animated creature which reacts to clears and is replaced at increasing difficulty.
- Clear, responsive mobile portrait UI retaining vintage Nokia-like simplicity; original art and sound.
- Implemented tests for all 15 test groups, runnable project, plain-English build steps, clear honesty about not-run builds/tests.
- **Final developer report:** chosen stack, files created, implementation status, how to launch/test, screenshots/build paths if real, test result summary, remaining bugs, and a short table listing which choices are based on original references versus modern design choices.

**Begin now. Prioritize complete functioning gameplay and historically verified rules over superficial mockups. When an original detail is unknown, expose it as a configuration choice and document it rather than making unsupported fidelity claims.**
