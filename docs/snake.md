# Snake

Open **Other Games → Snake** and choose your garden.

| Garden | What to expect |
| --- | --- |
| **Classic** | An open board, 10 points per fruit, and familiar Snake rules. |
| **Arcade** | Rock hazards, quick-pickup chains up to 3× points, and timed golden fruit. |

Coral fruit grows the snake. In Arcade, every five fruits reveals a golden fruit
worth **50 points** without extra growth. Catch it before its bar runs out.
The chain and golden-fruit timers freeze while paused.

Walls, your body, and Arcade rocks end the run. Fill every available cell to win.

| Control | Action |
| --- | --- |
| Right-side arrows or a board swipe | Turn |
| Arrow keys / WASD | Turn on web |
| Space / P | Pause or resume on web |
| Escape | Pause on web |
| Ⅱ / ▶ in the header | Pause or resume |

Easy, Normal, and Fast start at different speeds. Every five foods speeds up the
snake. A countdown gives you time to prepare when starting or resuming.

Your run and best score for each garden and speed save automatically. Leaving the screen,
switching apps, or hiding the browser pauses play. After reopening, choose
**Resume**. Starting a new run asks before replacing an unfinished one.
Existing Classic runs and scores remain available after the update.

Language, sound, and vibration follow the shared settings. Saves use the separate
`@snake/game-data` key and do not replace Galaxy Balls progress.

```sh
npm run test:snake
npm run sounds:snake
```
