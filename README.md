# PokePet 🐭⚡

A pixel Pokémon desktop pet for **macOS and Windows** with a built-in **Pomodoro timer** and **to-do list**.
English / 中文. Everything is stored locally.

## Run

```bash
npm install
npm start
```

## Build an installer

```bash
npm run dist       # both → install/PokePet-<version>-macOS.dmg + install/PokePet-<version>-Windows-Setup.exe
npm run dist:mac   # only macOS (universal: Apple Silicon + Intel)
npm run dist:win   # only Windows (x64 installer)
```

`install/` only keeps the two installers (unpacked builds and blockmaps are removed afterwards).

The builds are unsigned: on macOS right-click the app → *Open* the first time; on Windows click
*More info → Run anyway* in the SmartScreen dialog.

## How to play

| Action | Result |
| --- | --- |
| Click the pet | Pat it (hearts, mood ↑, a bit of XP) |
| Drag the pet | Carry it anywhere on screen |
| Double-click | Open the to-do list |
| Right-click / tray icon | Menu: timer, switch Pokémon, size, language, … |
| Click the timer pill | Open the Pomodoro view |

### How the pet, timer and to-dos work together

- **Focus session**: the pet stops wandering, shows a 🍅 countdown above its head and cheers you on
  when you pat it. Pick a to-do as the task you're working on (or press ▶ next to a to-do).
- **Session finished**: fanfare, stars, +20 XP. The pet then asks *“Did you finish …?”* – answer
  in the speech bubble to tick the task off.
- **Break**: the pet gets playful, walks around and suggests stretching / drinking water. When the
  break ends it asks whether to start the next round.
- **To-do done**: a berry drops from the sky and the pet eats it (+10 XP, mood ↑). Finishing all
  tasks triggers a celebration.
- **Reminders**: every N minutes (configurable, never during focus) the pet reminds you of open
  to-dos with a one-click “Start” button. To-dos with a due time ring an alarm when they're due.
- **Mood & levels**: each Pokémon levels up separately. Mood drops slowly if you ignore your pet;
  when it's lonely it will tell you.

### Reacting to your keyboard & mouse

No keyboard hook and no special permissions. The app only learns *when* a key was pressed, never which:
on macOS via `CGEventSourceSecondsSinceLastEventType`, on Windows via `GetAsyncKeyState`. Mouse clicks
and scrolling never count as typing, and the keyboard never appears during baths, meals, sleep etc.

- **Typing** → the pet sits down and types along on a tiny keyboard. After 15 min of typing
  without a focus session it suggests starting one.
- **Moving the mouse** → the pet looks towards the cursor (eyes for the built-ins, whole body for
  downloaded Pokémon). During breaks it sometimes chases the cursor.
- **Hovering over the pet** → it gets shy and happy. **Shaking the mouse fast** → it gets dizzy.
- **Away for 3 min** → it naps; when you come back it says hello.

### Care (QQ-Pet style)

Each Pokémon has **hunger, cleanliness and health** (plus mood). They drop over time – more slowly
while you're away or the app is closed (max. 12 h are counted).

- **Hungry** → the pet asks for food. **Dirty** → dirt spots and a fly; it wants a bath.
- Neglected for long (health < 60) it can **catch a cold**: green tint, sweat drops, droopy eyes,
  it barely walks. At 0 health it **faints** and only a Potion helps.
- **Berries 🍓 are the currency**: +3 per Pomodoro, +1 per finished to-do, +2 per day.
  Spend them in **Care**: Oran Berry, Poké Puff, Rare Candy, Potion. Bathing is free.
- Feed/bath/heal from the Care tab, the right-click menu or directly in the pet's speech bubble.
- **Droppings 💩**: some time after a meal (and now and then anyway) the pet poops on your screen.
  Click the dropping to clean it up. Until the pet is **bathed** it smells and its mood drops; if
  it stays unbathed its health sinks and it gets sick. Droppings left on screen also cost mood.

### Emotions

Speech bubbles show the Pokémon’s **PMD portrait with a matching emotion** (happy, joyous,
determined, worried, sad, pain, surprised, dizzy, crying …) – also depending on how it is doing
(sick, pooped, lonely). The control panel header, the Care tab and each diary entry show the
face for the current / that day’s mood.

### Diary

The pet writes a diary entry every day (in its own words, English or Chinese) from what happened:
focus sessions, finished tasks, meals, baths, sickness, pats. Every 7 days it tells you whether it
was **happy, okay or sad** that week (happiness score from mood, sick days and focus). The **Diary**
tab shows each week with focus minutes per day and a timeline of *when* you focused (hover for
details), plus the pet's portrait in a matching emotion.

### Pokémon & sprite sources

Six built-in Pokémon (Pikachu, Charmander, Bulbasaur, Squirtle, Eevee, Jigglypuff) with hand-made
pixel art (**HD** 2× with shading, or classic) that is shown until – and if – their PMD sprite has been downloaded. Every Pokémon – built-in or added – can use
a sprite from one of several sources (downloaded once, cached):

| Source | What you get |
| --- | --- |
| **PMD** ([SpriteCollab](https://github.com/PMDCollab/SpriteCollab)) – **default** | Pixel sprites with *all* their animations (~35: idle, walk in 8 directions, sleep, eat, hurt, faint, hop, attacks, charge, trip, look-up …). State animations follow the pet’s behaviour; attacks celebrate finished focus sessions, the rest play as random idle actions |
| **Showdown animated** | Pokémon Showdown's animated battle sprites |
| **Showdown Gen 5** | Animated Black/White pixel sprites |
| **HOME** | High-resolution renders |
| **PokeAPI B/W** | Animated Black/White sprites (mirror) |

Add any species by English name or Pokédex number in **Pokémon → Add any Pokémon** (optionally
shiny), and change the sprite of any card with its dropdown. Names (incl. Chinese) come from
[PokeAPI](https://pokeapi.co); diary portraits from PMD SpriteCollab.

## Project layout

```
main.js                 main process: windows, tray, timer, to-dos, persistence
src/main/care.js        hunger / cleanliness / health / sickness, items, berries
src/main/diary.js       daily records, weekly report
src/main/sources.js     sprite downloads (PMD, Showdown, HOME, PokeAPI)
src/preload.js          safe IPC bridge
src/pet/                transparent pet window (canvas animation, behaviour, bubbles)
src/panel/              control panel (Focus / To-dos / Care / Diary / Pokémon / Settings)
src/shared/sprites.js   pixel art (edit here!) + effect glyphs
src/shared/i18n.js      all UI text and pet dialogue (en / zh)
src/shared/sound.js     8-bit sound effects (WebAudio)
tools/                  sprite preview + icon generator
```

Edit sprites in `src/shared/sprites.js`, then `npm run preview-sprites` to render `sprite-preview.png`.

Data file: `~/Library/Application Support/PokePet/pokepet-data.json` (macOS) or
`%APPDATA%\PokePet\pokepet-data.json` (Windows).

Pokémon is © Nintendo / Creatures / GAME FREAK. This is a private fan project for personal use.
