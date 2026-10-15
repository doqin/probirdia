# Writing a game (for teachers)

Everything you write lives in this `content` folder as spreadsheets (CSV files).
In Google Sheets or Excel: **File > Download > Comma-separated values (.csv)**, then replace the file.

## 1. Proverbs: `glossary.csv`

One row per proverb. Columns:

| column | what to write |
|---|---|
| `proverb` | The proverb exactly as learners should see it |
| `meaning` | A short, plain-English explanation |
| `example` | (optional) An example sentence |
| `meaning_vi`, `example_vi` | (optional) Vietnamese versions. Leave empty for now |

## 1b. Hard words: `words.csv`

List words learners may not know. **You do not mark them in the story**: any time a listed word appears in a game (dialogue, notes, riddles), learners can hover or tap it to see the meaning. Only the first use in each block of text is underlined.

| column | what to write |
|---|---|
| `word` | The word (a short phrase also works, e.g. `holy grail`) |
| `forms` | (optional) Odd spellings to link too, separated by `;`, e.g. `went; gone`. Common endings are added automatically: *hesitate* also matches *hesitates*, *hesitated*, *hesitating* |
| `meaning`, `example` | As in the proverb glossary |
| `meaning_vi`, `example_vi` | (optional) Vietnamese |

Words also appear on the glossary page under the **Words** tab.

## 2. A game: `games/<game-name>/`

Each game is a folder with two files.

**`game.json`**: the title and description shown on the Games page. Set `"published": false` to hide a draft.

**`scenes.csv`**: one row per scene (one screen the player sees). The **first row is where the game starts**.

| column | what to write |
|---|---|
| `id` | A short unique name, e.g. `temple`. Other rows use it to point here |
| `heading` | (optional) A title above the text, e.g. `MAGIC BARRIER` |
| `text` | What the player reads |
| `note` | (optional) A parchment note that stays on screen: a riddle, a sign, a letter |
| `note_simple` | (optional) The note in plain words. Learners see it when they hover over (or tap) the note. Needs a `note` |
| `gives` | (optional) Items the player receives, separated by `;` e.g. `Shield of Frost; Map` |
| `status` | (optional) Conditions the player gains, separated by `;`, e.g. `Injured; Villagers' respect`. Shown in red (green if listed under `positive_status` in `game.json`) |
| `clears` | (optional) Statuses removed when the scene is entered, separated by `;`. Use it to replace a status, e.g. `Injured` becomes `Severely injured` |
| `next` | The `id` of the scene that follows, for scenes with a Continue button |
| `choice_1_label`, `choice_1_next` | A normal choice: button text, and the `id` it leads to |
| `choice_1_proverb`, `choice_1_next` | A **proverb choice**: the proverb (as written in the glossary) is the button, and its meaning is shown after the player picks it |
| `choice_2_...`, `choice_3_...`, `choice_4_...` | More choices, up to 4 |

| `route_1_if`, `route_1_next`, ... `route_6_*` | A **route** (see below): where to go depending on what the player has |

Rules:
- A scene has **either** `next` **or** choices **or** routes, not more than one.
- A scene with neither is an **ending**. The player sees a recap of the proverbs they met.
- A choice has **either** a label **or** a proverb.
- After a learner picks a proverb choice, the proverb and its meaning are shown as feedback (the example sentence is not shown there). The proverb buttons themselves have no hover popup.
- Hard words inside the text of a choice label are not hoverable (a button can't hold another button); keep label wording simple.

### Routes: different outcomes depending on earlier choices

A **route scene** is never shown. It sends the player to the first branch whose condition is true, so one choice can lead to different results for a healthy and an injured player. Leave `text` empty, then fill `route_1_if` / `route_1_next`, `route_2_if` / `route_2_next`, and so on. The **last** route must have an empty condition: it is used when nothing else fits.

| condition | true when |
|---|---|
| `status:Injured` | the player has that status |
| `has:Ring of Light` | the player has that item |
| `relics>=4` (also `<=`, `>`, `<`, `=`) | the number of relics is at least 4. Relics are the items listed under `relics` in `game.json` |
| `not ...`, `... and ...`, `... or ...` | combine conditions (`not` first, then `and`, then `or`; no brackets) |

Example (`help_route`): `status:Injured` -> `burned`, empty -> `saved`. `npm run validate` checks that conditions make sense and that every item or status they mention is given by some scene.

### `game.json` extras

- `"relics": ["Shield of Frost", ...]`: item names that count for `relics>=N`.
- `"positive_status": ["Villagers' respect"]`: statuses shown as good news (green).
- `"thumbnail"`: path under `public/`.

### Proverbs inside the story text

Wrap a proverb in double square brackets and learners can hover (or tap) it to see its meaning:

- `[[better late than never]]` shows the proverb as written.
- `[[it is not too late|better late than never]]` shows your own words, but links to that proverb.

Capital letters and punctuation don't matter when matching the proverb to the glossary.

### Vietnamese (later)

Add a column with the same name plus `_vi`, for example `text_vi`, `note_vi`, `choice_1_label_vi`. Anything left empty falls back to English.

## 3. Check your work

```
npm run validate
```

It reports problems by spreadsheet row, for example:
`slay-the-demon-king/scenes.csv row 7: scene "trap" points to "escap", which does not exist`.