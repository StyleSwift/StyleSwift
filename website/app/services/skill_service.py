import json
import sqlite3
from datetime import datetime

from app.database import get_connection
from app.models import SkillCreate, SkillCard, SkillResponse
from app.services.frontmatter_parser import parse_frontmatter, slugify


def _row_to_card(row: sqlite3.Row) -> SkillCard:
    return SkillCard(
        id=row["id"],
        slug=row["slug"],
        title=row["title"],
        description=row["description"],
        content_type=row["content_type"],
        has_css=bool(row["css_content"]),
        tags=json.loads(row["tags"]),
        author_name=row["author_name"],
        downloads_count=row["downloads_count"],
        is_featured=bool(row["is_featured"]),
        source=row["source"],
        created_at=row["created_at"],
    )


def _row_to_response(row: sqlite3.Row) -> SkillResponse:
    return SkillResponse(
        id=row["id"],
        slug=row["slug"],
        title=row["title"],
        description=row["description"],
        content_type=row["content_type"],
        content=row["content"],
        css_content=row["css_content"],
        example_url=row["example_url"],
        tags=json.loads(row["tags"]),
        author_name=row["author_name"],
        downloads_count=row["downloads_count"],
        is_featured=bool(row["is_featured"]),
        source=row["source"],
        created_at=row["created_at"],
    )


def _generate_unique_slug(conn: sqlite3.Connection, base_slug: str) -> str:
    slug = base_slug
    counter = 1
    while True:
        row = conn.execute(
            "SELECT 1 FROM skills WHERE slug = ?", (slug,)
        ).fetchone()
        if not row:
            return slug
        counter += 1
        slug = f"{base_slug}-{counter}"


def create_skill(data: SkillCreate) -> SkillResponse:
    content_type = data.content_type

    if content_type in ("style_dna", "mixed"):
        meta, _ = parse_frontmatter(data.content or "")
        title = data.title or meta.get("name", "Untitled")
        description = data.description or meta.get("description", "")
    else:
        title = data.title
        description = data.description

    base_slug = slugify(title)

    conn = get_connection()
    try:
        slug = _generate_unique_slug(conn, base_slug)
        tags_json = json.dumps(data.tags)
        now = datetime.utcnow().isoformat()

        cursor = conn.execute(
            """INSERT INTO skills (slug, title, description, content_type, content,
               css_content, example_url, tags, author_name, source, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'community', ?, ?)""",
            (slug, title, description, content_type, data.content,
             data.css_content, data.example_url, tags_json, data.author_name, now, now),
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM skills WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return _row_to_response(row)
    finally:
        conn.close()


def get_skill_by_slug(slug: str) -> SkillResponse | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM skills WHERE slug = ?", (slug,)
        ).fetchone()
        if not row:
            return None
        return _row_to_response(row)
    finally:
        conn.close()


def list_skills(
    content_type: str | None = None,
    tag: str | None = None,
    sort: str = "latest",
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[SkillCard], int]:
    conn = get_connection()
    try:
        where_clauses = []
        params: list = []

        if content_type:
            if content_type == "has_css":
                where_clauses.append("s.css_content IS NOT NULL AND s.css_content != ''")
            else:
                where_clauses.append("s.content_type = ?")
                params.append(content_type)

        if tag:
            where_clauses.append(
                "EXISTS (SELECT 1 FROM json_each(s.tags) WHERE json_each.value = ?)"
            )
            params.append(tag)

        where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        count_row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM skills s{where_sql}", params
        ).fetchone()
        total = count_row["cnt"]

        order = "s.downloads_count DESC" if sort == "popular" else "s.created_at DESC"
        offset = (page - 1) * per_page

        rows = conn.execute(
            f"""SELECT s.* FROM skills s{where_sql}
                ORDER BY {order}
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        ).fetchall()

        return [_row_to_card(r) for r in rows], total
    finally:
        conn.close()


def get_featured_skills(limit: int = 6) -> list[SkillCard]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM skills WHERE is_featured = 1 ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [_row_to_card(r) for r in rows]
    finally:
        conn.close()


def get_latest_skills(limit: int = 12) -> list[SkillCard]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM skills ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [_row_to_card(r) for r in rows]
    finally:
        conn.close()


def get_stats() -> dict[str, int]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as total, COALESCE(SUM(downloads_count), 0) as downloads FROM skills"
        ).fetchone()
        return {"total": row["total"], "downloads": row["downloads"]}
    finally:
        conn.close()


def increment_downloads(slug: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "UPDATE skills SET downloads_count = downloads_count + 1 WHERE slug = ?",
            (slug,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_related_skills(slug: str, limit: int = 4) -> list[SkillCard]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM skills WHERE slug = ?", (slug,)
        ).fetchone()
        if not row:
            return []

        tags = json.loads(row["tags"])
        if not tags:
            return []

        placeholders = ",".join("?" for _ in tags)
        rows = conn.execute(
            f"""SELECT DISTINCT s.* FROM skills s, json_each(s.tags) j
                WHERE s.slug != ? AND j.value IN ({placeholders})
                ORDER BY s.downloads_count DESC
                LIMIT ?""",
            [slug] + tags + [limit],
        ).fetchall()
        return [_row_to_card(r) for r in rows]
    finally:
        conn.close()
