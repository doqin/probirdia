#!/usr/bin/env python3
"""
Synthesises the game's music and sound effects (original chiptune, no samples) and
encodes them to MP3 with ffmpeg.

    python3 scripts/make-audio.py [out_dir]

Default out_dir: public/games/starting-university/audio
Only the standard library and ffmpeg are needed.
"""
import math
import os
import random
import struct
import subprocess
import sys
import tempfile
import wave

RATE = 22050
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(__file__), '..', 'public', 'games', 'starting-university', 'audio')

NOTES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def hz(name):
    """'C4', 'F#3', 'Bb2' -> frequency."""
    n = NOTES[name[0]]
    i = 1
    while name[i] in '#b':
        n += 1 if name[i] == '#' else -1
        i += 1
    octave = int(name[i:])
    return 440.0 * 2 ** ((n + 12 * (octave + 1) - 69) / 12)


def osc(kind, phase):
    p = phase % 1.0
    if kind == 'square':
        return 1.0 if p < 0.5 else -1.0
    if kind == 'pulse':
        return 1.0 if p < 0.25 else -1.0
    if kind == 'tri':
        return 4 * abs(p - 0.5) - 1
    return 2 * p - 1  # saw


class Track:
    def __init__(self, seconds):
        self.buf = [0.0] * int(seconds * RATE)

    def tone(self, t0, dur, freq, kind='square', vol=0.2, attack=0.005, release=0.08, glide=None):
        start = int(t0 * RATE)
        n = int(dur * RATE)
        phase = 0.0
        for i in range(n):
            j = start + i
            if j >= len(self.buf):
                break
            t = i / RATE
            f = freq if glide is None else freq + (glide - freq) * (i / n)
            phase += f / RATE
            env = min(1.0, t / attack) if attack else 1.0
            left = dur - t
            if left < release:
                env *= max(0.0, left / release)
            self.buf[j] += osc(kind, phase) * vol * env

    def noise(self, t0, dur, vol=0.1, release=0.05):
        start = int(t0 * RATE)
        n = int(dur * RATE)
        rng = random.Random(7)
        for i in range(n):
            j = start + i
            if j >= len(self.buf):
                break
            env = max(0.0, 1 - i / n) ** (release * 40)
            self.buf[j] += (rng.random() * 2 - 1) * vol * env

    def save(self, name, gain=0.8):
        peak = max(1e-9, max(abs(s) for s in self.buf))
        scale = min(gain / peak, 1.0) if peak > gain else 1.0
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, name + '.wav')
            with wave.open(wav, 'wb') as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(RATE)
                w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * scale)) * 32767)) for s in self.buf))
            os.makedirs(OUT, exist_ok=True)
            dest = os.path.join(OUT, name + '.mp3')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-b:a', '56k', dest], check=True)
            print(f'{dest}  {len(self.buf) / RATE:.1f}s  {os.path.getsize(dest) // 1024} KB')


# ---- music ----------------------------------------------------------------

def song(name, bpm, bars, chords, melody, lead='square', bassline='tri', arp=True, lead_vol=0.14):
    """
    chords: one (root, [chord tones]) per bar, cycling.
    melody: list of (beat, length_in_beats, note) over the whole song (4 beats per bar).
    """
    beat = 60.0 / bpm
    tr = Track(bars * 4 * beat)
    for bar in range(bars):
        root, tones = chords[bar % len(chords)]
        b0 = bar * 4 * beat
        # bass: root on 1 and 3, fifth pickup
        tr.tone(b0, beat * 1.6, hz(root), bassline, 0.26, release=0.1)
        tr.tone(b0 + 2 * beat, beat * 1.6, hz(root), bassline, 0.26, release=0.1)
        if arp:
            for i in range(8):
                tr.tone(b0 + i * beat / 2, beat / 2 * 0.9, hz(tones[i % len(tones)]), 'pulse', 0.06, release=0.05)
    for b, length, note in melody:
        if note:
            tr.tone(b * beat, length * beat * 0.95, hz(note), lead, lead_vol, attack=0.01, release=0.12)
    return tr


def theme():
    chords = [('C3', ['C4', 'E4', 'G4']), ('A2', ['A3', 'C4', 'E4']), ('F2', ['F3', 'A3', 'C4']), ('G2', ['G3', 'B3', 'D4'])]
    m = [(0, 1, 'E5'), (1, 1, 'G5'), (2, 2, 'C6'), (4, 1.5, 'B5'), (5.5, .5, 'A5'), (6, 2, 'E5'),
         (8, 1, 'C5'), (9, 1, 'E5'), (10, 2, 'A5'), (12, 1.5, 'G5'), (13.5, .5, 'E5'), (14, 2, 'C5'),
         (16, 1, 'A5'), (17, 1, 'C6'), (18, 2, 'F5'), (20, 1.5, 'E5'), (21.5, .5, 'D5'), (22, 2, 'C5'),
         (24, 1, 'D5'), (25, 1, 'G5'), (26, 2, 'B5'), (28, 2, 'D6'), (30, 2, 'G5')]
    song('theme', 96, 8, chords, m, lead='square').save('theme')


def story_a():
    chords = [('F2', ['F3', 'A3', 'C4']), ('D3', ['D4', 'F4', 'A4']), ('Bb2', ['Bb3', 'D4', 'F4']), ('C3', ['C4', 'E4', 'G4'])]
    m = [(0, 2, 'A4'), (2, 1, 'C5'), (3, 1, 'D5'), (4, 3, 'F5'), (7, 1, None),
         (8, 2, 'D5'), (10, 1, 'C5'), (11, 1, 'A4'), (12, 4, 'F4'),
         (16, 2, 'D5'), (18, 1, 'F5'), (19, 1, 'E5'), (20, 3, 'D5'),
         (24, 2, 'E5'), (26, 1, 'D5'), (27, 1, 'C5'), (28, 4, 'C5')]
    song('story-a', 80, 8, chords, m, lead='tri', lead_vol=0.2).save('story-a')


def story_b():
    chords = [('G2', ['G3', 'B3', 'D4']), ('E3', ['E4', 'G4', 'B4']), ('C3', ['C4', 'E4', 'G4']), ('D3', ['D4', 'F#4', 'A4'])]
    m = [(0, .5, 'D5'), (.5, .5, 'G5'), (1, 1, 'B5'), (2, 2, 'A5'), (4, .5, 'G5'), (4.5, .5, 'E5'), (5, 1, 'G5'), (6, 2, 'B4'),
         (8, .5, 'E5'), (8.5, .5, 'G5'), (9, 1, 'C6'), (10, 2, 'B5'), (12, .5, 'A5'), (12.5, .5, 'F#5'), (13, 1, 'A5'), (14, 2, 'D5'),
         (16, .5, 'D5'), (16.5, .5, 'G5'), (17, 1, 'B5'), (18, 2, 'D6'), (20, 1, 'C6'), (21, 1, 'B5'), (22, 2, 'G5'),
         (24, 1, 'E5'), (25, 1, 'G5'), (26, 2, 'C6'), (28, 1, 'B5'), (29, 1, 'A5'), (30, 2, 'D5')]
    song('story-b', 104, 8, chords, m, lead='square', lead_vol=0.12).save('story-b')


def think():
    chords = [('A2', ['A3', 'C4', 'E4']), ('F2', ['F3', 'A3', 'C4']), ('C3', ['C4', 'E4', 'G4']), ('E3', ['E4', 'G#4', 'B4'])]
    m = [(0, 1, 'E5'), (1, 1, None), (2, 1, 'E5'), (3, 1, 'D5'), (4, 2, 'C5'), (6, 2, 'A4'),
         (8, 1, 'C5'), (9, 1, None), (10, 1, 'C5'), (11, 1, 'B4'), (12, 2, 'A4'), (14, 2, 'F4'),
         (16, 1, 'G4'), (17, 1, 'C5'), (18, 1, 'E5'), (19, 1, 'G5'), (20, 2, 'E5'), (22, 2, 'C5'),
         (24, 1, 'B4'), (25, 1, 'D5'), (26, 1, 'G#4'), (27, 1, 'B4'), (28, 4, 'E5')]
    song('think', 112, 8, chords, m, lead='pulse', lead_vol=0.12).save('think')


def win():
    tr = Track(4.0)
    seq = [('C5', 0), ('E5', .14), ('G5', .28), ('C6', .42), ('G5', .7), ('C6', .84), ('E6', 1.0)]
    for n, t in seq:
        tr.tone(t, .22, hz(n), 'square', .16, release=.05)
    for n in ('C5', 'E5', 'G5', 'C6'):
        tr.tone(1.3, 1.9, hz(n), 'tri', .13, release=.6)
    tr.tone(1.3, 1.9, hz('C3'), 'tri', .25, release=.6)
    tr.save('win')


def lose():
    tr = Track(4.0)
    for n, t in [('E5', 0), ('D5', .35), ('C5', .7), ('A4', 1.05)]:
        tr.tone(t, .4, hz(n), 'tri', .22, release=.15)
    for n in ('A3', 'C4', 'E4'):
        tr.tone(1.5, 2.2, hz(n), 'tri', .12, release=.9)
    tr.tone(1.5, 2.2, hz('A2'), 'tri', .22, release=.9)
    tr.save('lose')


# ---- sound effects --------------------------------------------------------

def sfx():
    t = Track(0.09)
    t.tone(0, .05, 1200, 'square', .12, attack=.002, release=.03)
    t.save('sfx-hover')

    t = Track(0.25)
    t.tone(0, .07, hz('E5'), 'square', .18, release=.02)
    t.tone(.07, .14, hz('B5'), 'square', .18, release=.08)
    t.save('sfx-select')

    t = Track(0.7)
    for i, n in enumerate(('C5', 'E5', 'G5', 'C6')):
        t.tone(i * .08, .3 if i == 3 else .1, hz(n), 'square', .16, release=.12)
    t.save('sfx-correct')

    t = Track(0.6)
    t.tone(0, .18, hz('G3'), 'saw', .18, release=.05)
    t.tone(.18, .3, hz('D#3'), 'saw', .18, release=.2, glide=hz('C3'))
    t.noise(0, .12, .05)
    t.save('sfx-wrong')


if __name__ == '__main__':
    for fn in (theme, story_a, story_b, think, win, lose, sfx):
        fn()
