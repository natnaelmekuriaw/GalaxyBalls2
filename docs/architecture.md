# Project structure

The app contains a game library and independent game modules. Galaxy Balls is the
only registered game today. Adding another game should not require editing its
engine, controls, save parser, or screen.

```text
src/
  app/                       Expo Router routes and navigation layouts
    _layout.tsx              App providers, startup splash, root stack
    (tabs)/                  Existing Game and Games tabs; URLs stay / and /explore
  features/
    game-library/            Games collection screen
  games/
    gameRegistry.ts          Available games, routes, icons, localized card labels
    galaxy-balls/
      GalaxyBallsScreen.tsx  Game menus and gameplay screen
      engine/                Pure rules, pieces, scoring, and seeded randomness
      components/            Game controls, feedback, and new-game confirmation
      controls/              Movement repeat controller
      hooks/                 Held movement and game audio lifecycle
      audio/                 Game cue controller and resolution sound mapping
      gameplay/              Match and level feedback
      layout/                Board and arena sizing
      data/                  Game save validation, score ranking, and data context
  shared/
    components/              Text, themed UI, tabs, and startup splash
    hooks/                   Shared color scheme and theme hooks
    i18n/                    Language selection, fonts, and translation catalog
    preferences/             Language, audio, menu music, and vibration preferences
    theme.ts                 Shared app theme
  data/                      App storage composition and compatibility
  providers/                 Provider composition and storage hydration
assets/
  branding/                  App identity and current home artwork
  fonts/                     Shared offline fonts and license
  games/galaxy-balls/sounds/  Galaxy Balls sound pack
scripts/games/galaxy-balls/   Sound generator
tests/
  app/                       App persistence and legacy save compatibility
  shared/                    Shared translations
  games/galaxy-balls/         Engine, controls, feedback, layout, audio, and resume
```

## Boundaries

- Keep route files small. They select a screen and export its route metadata;
  implementation belongs outside `src/app/`.
- Put game rules, game-only UI, audio, assets, and saved-state validation under
  that game's folders. A game may use shared utilities; it must not import
  another game's engine or controls.
- Shared code must not import a game module. App composition in `src/providers/`
  and `src/data/` connects the shared and game-specific contexts.
- Use `useAppPreferences()` for shared preferences. Use `useGalaxyBallsData()`
  only for Galaxy Balls scores, checkpoint, block symbols, and rotation mode.
- Keep pure modules usable by Node tests. Runtime imports between pure
  TypeScript modules use explicit `.ts` paths where required by Node.

## Save compatibility

`AppDataProvider` owns one store and waits for storage hydration before mounting
screens or audio. It publishes separate shared-preference and Galaxy Balls data
contexts. The shared context stays stable during board checkpoint updates.

Existing installations retain the exact `@galaxy-balls/game-data` key and flat
`version: 1` JSON format. Preferences, scores, and unfinished games are preserved;
this folder refactor requires no storage migration. The app composition store is
the compatibility boundary for that existing document. Never create a second
writer for the same key.

New games should use their own namespaced keys and game-specific parsers and
contexts. They should consume the shared preference context rather than copy
language or sound settings into their own saves. Finishing a game must update
its score and checkpoint together.

## Adding a game

1. Create its implementation under `src/games/<game-id>/` and its assets under
   `assets/games/<game-id>/`. Add its tests under `tests/games/<game-id>/`.
2. Add a thin route under `src/app/games/`. The root stack opens it independently
   of the Game/Games tabs, so every new game does not become a navigation tab.
3. Add its typed definition to `GAME_REGISTRY` with a unique ID, route, static
   image reference, and translated description and launch label. The collection
   renders the registry; it does not import game screens or engines. Update the
   collection introduction when more games become available.
4. Compose any new game data provider at the app level as needed. Keep its save
   schema separate from other games and preserve existing stored data.
5. Run the full test suite, lint, TypeScript, and platform bundling, then verify
   navigation and resume behavior in the app before merging.

`npm test` finds nested suites. `npm run test:galaxy-balls` runs this game's
suites; the existing `test:data`, `test:resume`, `test:sounds`, and `sounds:build`
commands point to their organized locations.
