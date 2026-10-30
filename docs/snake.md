# Snake

Open **Other Games → Snake**. Eat the gold food for 10 points and one extra
segment. Hitting a wall or your body ends the run; filling the board wins.

| Control | Action |
| --- | --- |
| Right-side arrows or a board swipe | Turn |
| Arrow keys / WASD | Turn on web |
| Space / P | Pause or resume on web |
| Escape | Pause on web |
| Ⅱ / ▶ in the header | Pause or resume |

Easy, Normal, and Fast start at different speeds. Every five foods speeds up the
snake. A countdown gives you time to prepare when starting or resuming.

Your run and best score for each speed save automatically. Leaving the screen,
switching apps, or hiding the browser pauses play. After reopening, choose
**Resume**. Starting a new run asks before replacing an unfinished one.

Language, sound, and vibration follow the shared settings. Saves use the separate
`@snake/game-data` key and do not replace Galaxy Balls progress.

```sh
npm run test:snake
npm run sounds:snake
```
