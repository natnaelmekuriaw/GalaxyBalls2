# Snake assets

`icon.png` is the game-library artwork. Its brief: a lime-green snake
formed from rounded square segments in an S curve, ivory eyes, and a gold apple
on a dark forest checkerboard. Keep the face and food readable at small sizes;
use no text or baked-in rounded corners.

The menu and game board use shared native shapes for the connected snake,
fruit, rocks, and garden plants. Optional pickup motion follows the device's
reduced-motion preference.

The seven original PCM effects in `sounds/` are rebuilt with
`npm run sounds:snake`: start, turn, eat, bonus, level, lose, and win.
