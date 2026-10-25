# Whot on start.ng

Whot, the Nigerian card game, for 2 to 4 players. It will live at `whot.start.ng`.

- One person makes a room and shares the code. Friends join with the code or the link, bots can fill empty seats, and the person who made the room starts the game.
- The server deals, shuffles and checks every card, and only ever sends you your own hand, so nobody can peek or cheat. A player who drops can come back (10 minutes); after that a bot takes their seat so the others can finish. Everyone needs to be signed in with start.ng.

**The rules used** (also on the game's page): 54 cards (circles and triangles 1 to 5, 7, 8, 10 to 14; crosses and squares 1, 2, 3, 5, 7, 10, 11, 13, 14; stars 1 to 5, 7, 8; five Whot cards). 6 cards each with two players, 5 with more. Play a card that matches the top card in shape or number, or a Whot card on anything (it names the shape), or pick one from the market and your turn ends. **1** hold on (play again), **14** general market (everyone else picks one, you play again), **8** suspension (the next player misses a turn), **2** pick two and **5** pick three (the next player picks up, unless they play another 2 or 5, which adds on). First to play their last card wins. Whot is played with different special cards in different places; these are the common ones.

A plain HTML, CSS and JavaScript game (no build step) that loads the start.ng Kit (`https://start.ng/kit.js`). The rules live on the server (`startng-be`, `app/features/rooms/games/whot.py`).

A move is `{ "play": <place in your hand>, "shape": "circle" }` (the shape only with a Whot card) or `{ "draw": true }`.

## Publish
On start.ng, sign in, open **Your games** and paste this repo's link. The repo must be named `whot`.

| File | What it does |
| --- | --- |
| `index.html` | The page: lobby, waiting room, table |
| `game.js` | The lobby, rooms (through `startng.rooms`), the cards and the table |
| `style.css` | The look |
| `startng.json` | The description shown on the game's page |
