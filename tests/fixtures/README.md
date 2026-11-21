# Test fixtures

`games/slay-the-demon-king/` is the branching game that used to ship on the site.
It was dropped from the product (the lesson format changed), but the CSV loader
and the game engine still need a realistic, long, branch-heavy game to test
against, so it lives here instead. Its artwork and presentation file are gone —
the tests that need art build a temporary presentation instead.

Nothing in this folder is read by the site build. `content/` is the real content.
