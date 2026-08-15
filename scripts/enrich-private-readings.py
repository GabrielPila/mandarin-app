#!/usr/bin/env python3
"""Add tone-marked, character-aligned pinyin to a private readings JSON file."""

import json
import re
import sys
from pathlib import Path

from pypinyin import Style, pinyin


HAN = re.compile(r"[\u3400-\u9fff\uf900-\ufaff]")


def aligned_pinyin(text: str) -> str:
    values = pinyin(
        text,
        style=Style.TONE,
        heteronym=False,
        neutral_tone_with_five=False,
        errors=lambda chars: [f"#{char}" for char in chars],
    )
    syllables = [item[0] for item in values if not item[0].startswith("#")]
    expected = len(HAN.findall(text))
    if len(syllables) != expected:
        raise ValueError(
            f"pinyin alignment failed: expected {expected}, got {len(syllables)}: {text}"
        )
    joined = " ".join(syllables)
    # Context corrections used by this reader. Pypinyin's general phrase
    # dictionary occasionally selects a literary/nominal reading here.
    joined = joined.replace(" dū ", " dōu ")
    joined = joined.replace("xiǎo xīn dì", "xiǎo xīn de")
    joined = joined.replace("kāi xīn dì", "kāi xīn de")
    joined = joined.replace("yī huì er", "yí huì er")
    return joined


def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "private-source/readings.json")
    data = json.loads(path.read_text(encoding="utf-8"))
    for book in data:
        for chapter in book["chapters"]:
            for line in chapter["lines"]:
                line["py"] = aligned_pinyin(line["zh"])
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
