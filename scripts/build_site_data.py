import csv
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output"
SITE_DIR = ROOT / "site"
DATA_DIR = SITE_DIR / "data"
MASTER_CSV = OUTPUT_DIR / "李敖人生智慧_总表.csv"
SITE_JSON = DATA_DIR / "wisdom-data.json"
SITE_JS = DATA_DIR / "wisdom-data.js"


def read_rows():
    with MASTER_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    expected = [
        "id",
        "book",
        "source_file",
        "source_chapter",
        "source_text",
        "wisdom_title",
        "wisdom_text",
        "theme_tags",
    ]
    if reader.fieldnames != expected:
        raise ValueError(f"Unexpected CSV columns: {reader.fieldnames}")
    return rows


def split_tags(value):
    return [tag.strip() for tag in (value or "").split(";") if tag.strip()]


def main():
    rows = read_rows()
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    books = Counter(row["book"] for row in rows)
    tags = Counter(tag for row in rows for tag in split_tags(row["theme_tags"]))
    source_files = Counter((row["book"], row["source_file"]) for row in rows)

    missing = [
        row["id"]
        for row in rows
        if not all(row.get(field, "").strip() for field in ("id", "book", "wisdom_title", "wisdom_text"))
    ]
    if missing:
        raise ValueError(f"Rows with missing required fields: {missing[:10]}")
    if len({row["id"] for row in rows}) != len(rows):
        raise ValueError("Duplicate IDs found in master CSV")

    data = {
        "meta": {
            "title": "李敖人生智慧",
            "source": str(MASTER_CSV.relative_to(ROOT)).replace("\\", "/"),
            "totalItems": len(rows),
            "totalBooks": len(books),
            "totalTags": len(tags),
            "totalSourceFiles": len(source_files),
        },
        "books": [
            {"name": name, "count": count}
            for name, count in sorted(books.items(), key=lambda item: (-item[1], item[0]))
        ],
        "tags": [
            {"name": name, "count": count}
            for name, count in sorted(tags.items(), key=lambda item: (-item[1], item[0]))
        ],
        "items": rows,
    }

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    SITE_JSON.write_text(payload, encoding="utf-8")
    SITE_JS.write_text(f"window.LI_AO_WISDOM_DATA={payload};\n", encoding="utf-8")
    print(f"items={len(rows)}")
    print(f"books={len(books)}")
    print(f"tags={len(tags)}")
    print(f"sourceFiles={len(source_files)}")
    print(f"wrote={SITE_JSON}")
    print(f"wrote={SITE_JS}")


if __name__ == "__main__":
    main()
