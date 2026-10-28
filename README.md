<p align="center">
  <img src="assets/branding/galaxy-balls-title.png" width="360" alt="Galaxy Balls" />
</p>

<p align="center">A Nokia-inspired block puzzle for mobile and web.</p>

<p align="center">
  <a href="#how-to-play">How to play</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#run-locally">Run locally</a> ·
  <a href="docs/architecture.md">Folder guide</a>
</p>

## How to play

Match colors, trigger cascades, and keep the board from filling up.

| Mode | Falling speed | Landing guide | Instant drop |
| --- | --- | --- | --- |
| **Classic** | Slower | — | — |
| **Quick Play** | Faster | ✓ | ✓ |

Hold **◀ ▼ ▶** to move. Tap **↻** to rotate; **⇓** drops instantly in Quick Play.

- **Languages:** English · አማርኛ · Afaan Oromoo
- **Audio:** menu music and effects, with separate controls
- **Progress:** saved runs, local high scores, and a confirmation before replacing a game
- **Settings:** vibration, block symbols, and rotation preferences

## Screenshots

Click a screenshot to open it full size.

<p align="center">
  <a href="docs/images/home.jpg"><img src="docs/images/home.jpg" width="220" alt="Home menu with language selection and Resume Game" /></a>
  <a href="docs/images/gameplay.jpg"><img src="docs/images/gameplay.jpg" width="220" alt="Galaxy Balls board, next-piece preview, cascade feedback, and movement controls" /></a>
</p>

## Run locally

```sh
npm install
npm run web
```

For mobile development, run `npm start`.

<details>
<summary><strong>What gets saved?</strong></summary>

Your current game, top-five scores, language, and settings stay on this device.
Reopen the app and choose **Resume Game** to continue.

Starting another run asks before replacing a saved game. Clearing app or browser
data removes local saves.

</details>

<details>
<summary><strong>Developer commands & notes</strong></summary>

```sh
npm run lint
npx tsc --noEmit
npm test
```

- Game-only tests: `npm run test:galaxy-balls`
- Rebuild sounds: `npm run sounds:build`
- Launcher icons and splash changes need a new native build.

[Project structure & adding games](docs/architecture.md) · [Artwork](assets/branding/README.md) · [Font license](assets/fonts/OFL.txt)

</details>
