import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import SKILLS_DIR
from app.database import init_db, get_connection
from app.services.frontmatter_parser import parse_frontmatter, slugify

STYLE_DNA_FILES = {
    "MatrixTerminal", "9xRetro", "CozyStyle", "NewspaperStyle",
    "bauhaus", "cyberpunk-2077",
}

TAG_KEYWORDS = {
    "colors": ["color scheme", "background-color", "color:", "#"],
    "typography": ["typography", "font-family", "font-size", "font"],
    "animation": ["animation", "transition", "@keyframes", "transform"],
    "dark": ["dark", "#0", "#1", "#2"],
    "retro": ["retro", "vintage", "90s", "9x"],
    "minimal": ["minimal", "clean", "simple"],
    "cyberpunk": ["cyberpunk", "neon", "glow"],
    "organic": ["organic", "natural", "warm", "cozy"],
}


def auto_tags(name: str, description: str, body: str) -> list[str]:
    text = f"{name} {description} {body}".lower()
    tags = []
    for tag, keywords in TAG_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            tags.append(tag)
    return tags[:5]


def seed() -> None:
    init_db()
    skills_dir = Path(SKILLS_DIR)

    if not skills_dir.exists():
        print(f"Skills directory not found: {skills_dir}")
        return

    conn = get_connection()
    count = 0

    try:
        for md_file in sorted(skills_dir.glob("*.md")):
            text = md_file.read_text(encoding="utf-8")
            meta, body = parse_frontmatter(text)

            name = meta.get("name", md_file.stem)
            description = meta.get("description", "")
            slug = slugify(name)

            existing = conn.execute(
                "SELECT 1 FROM skills WHERE slug = ?", (slug,)
            ).fetchone()
            if existing:
                continue

            is_style_dna = md_file.stem in STYLE_DNA_FILES
            content_type = "style_dna"
            tags = auto_tags(name, description, body)
            is_featured = 1 if is_style_dna else 0

            conn.execute(
                """INSERT INTO skills (slug, title, description, content_type, content,
                   tags, author_name, is_featured, source)
                   VALUES (?, ?, ?, ?, ?, ?, 'StyleSwift', ?, 'bundled')""",
                (slug, name, description, content_type, text,
                 str(tags).replace("'", '"'), is_featured),
            )
            count += 1
            print(f"  Seeded: {name} ({slug})")

        conn.commit()
        print(f"\nDone. Seeded {count} skills.")
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
