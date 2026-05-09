import json
import sqlite3

from app.database import get_connection
from app.models import SkillCard


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


def search_skills(
    query: str,
    content_type: str | None = None,
    tag: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[SkillCard], int]:
    conn = get_connection()
    try:
        if not query.strip():
            from app.services.skill_service import list_skills
            return list_skills(content_type, tag, "latest", page, per_page)

        where_clauses = []
        params: list = []

        fts_query = " OR ".join(f'"{w}"' for w in query.strip().split() if w)
        where_clauses.append("s.id IN (SELECT rowid FROM skills_fts WHERE skills_fts MATCH ?)")
        params.append(fts_query)

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

        where_sql = " WHERE " + " AND ".join(where_clauses)

        count_row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM skills s{where_sql}", params
        ).fetchone()
        total = count_row["cnt"]

        offset = (page - 1) * per_page
        rows = conn.execute(
            f"""SELECT s.* FROM skills s{where_sql}
                ORDER BY s.downloads_count DESC
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        ).fetchall()

        return [_row_to_card(r) for r in rows], total
    finally:
        conn.close()


def get_all_tags() -> list[dict[str, str | int]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """SELECT j.value as tag, COUNT(*) as count
               FROM skills s, json_each(s.tags) j
               GROUP BY j.value
               ORDER BY count DESC"""
        ).fetchall()
        return [{"tag": r["tag"], "count": r["count"]} for r in rows]
    finally:
        conn.close()


def quick_search(query: str, limit: int = 8) -> list[SkillCard]:
    conn = get_connection()
    try:
        if not query.strip():
            return []

        fts_query = " OR ".join(f'"{w}"' for w in query.strip().split() if w)
        rows = conn.execute(
            """SELECT s.* FROM skills s
               WHERE s.id IN (SELECT rowid FROM skills_fts WHERE skills_fts MATCH ?)
               ORDER BY s.downloads_count DESC
               LIMIT ?""",
            (fts_query, limit),
        ).fetchall()
        return [_row_to_card(r) for r in rows]
    finally:
        conn.close()
