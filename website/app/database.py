import sqlite3
from app.config import DB_PATH, DATA_DIR


SCHEMA = """
CREATE TABLE IF NOT EXISTS skills (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    content_type    TEXT NOT NULL CHECK(content_type IN ('style_dna', 'css_snippet', 'mixed')),
    content         TEXT,
    css_content     TEXT,
    example_url     TEXT,
    tags            TEXT NOT NULL DEFAULT '[]',
    author_name     TEXT NOT NULL DEFAULT 'Anonymous',
    downloads_count INTEGER NOT NULL DEFAULT 0,
    is_featured     INTEGER NOT NULL DEFAULT 0,
    source          TEXT NOT NULL DEFAULT 'community',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
    title,
    description,
    tags,
    content,
    css_content,
    tokenize='trigram',
    content='skills',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS skills_ai AFTER INSERT ON skills BEGIN
    INSERT INTO skills_fts(rowid, title, description, tags, content, css_content)
    VALUES (new.id, new.title, new.description, new.tags, new.content, new.css_content);
END;

CREATE TRIGGER IF NOT EXISTS skills_ad AFTER DELETE ON skills BEGIN
    INSERT INTO skills_fts(skills_fts, rowid, title, description, tags, content, css_content)
    VALUES ('delete', old.id, old.title, old.description, old.tags, old.content, old.css_content);
END;

CREATE TRIGGER IF NOT EXISTS skills_au AFTER UPDATE ON skills BEGIN
    INSERT INTO skills_fts(skills_fts, rowid, title, description, tags, content, css_content)
    VALUES ('delete', old.id, old.title, old.description, old.tags, old.content, old.css_content);
    INSERT INTO skills_fts(rowid, title, description, tags, content, css_content)
    VALUES (new.id, new.title, new.description, new.tags, new.content, new.css_content);
END;

CREATE INDEX IF NOT EXISTS idx_skills_content_type ON skills(content_type);
CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skills_is_featured ON skills(is_featured);
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
"""


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Apply incremental migrations for existing databases."""
    cursor = conn.execute("PRAGMA table_info(skills)")
    columns = {row["name"] for row in cursor.fetchall()}

    if "css_content" not in columns:
        conn.execute("ALTER TABLE skills ADD COLUMN css_content TEXT")

    # Fix CHECK constraint to allow 'mixed' — SQLite doesn't support ALTER CHECK,
    # so we recreate the table if the old constraint is present.
    check_row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='skills'"
    ).fetchone()
    if check_row and "'mixed'" not in check_row["sql"]:
        conn.executescript("""
            DROP TRIGGER IF EXISTS skills_ai;
            DROP TRIGGER IF EXISTS skills_ad;
            DROP TRIGGER IF EXISTS skills_au;
            DROP TABLE IF EXISTS skills_fts;

            CREATE TABLE skills_new (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                slug            TEXT NOT NULL UNIQUE,
                title           TEXT NOT NULL,
                description     TEXT NOT NULL DEFAULT '',
                content_type    TEXT NOT NULL CHECK(content_type IN ('style_dna', 'css_snippet', 'mixed')),
                content         TEXT,
                css_content     TEXT,
                example_url     TEXT,
                tags            TEXT NOT NULL DEFAULT '[]',
                author_name     TEXT NOT NULL DEFAULT 'Anonymous',
                downloads_count INTEGER NOT NULL DEFAULT 0,
                is_featured     INTEGER NOT NULL DEFAULT 0,
                source          TEXT NOT NULL DEFAULT 'community',
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );
            INSERT INTO skills_new SELECT id, slug, title, description, content_type,
                content, css_content, example_url, tags, author_name,
                downloads_count, is_featured, source, created_at, updated_at FROM skills;
            DROP TABLE skills;
            ALTER TABLE skills_new RENAME TO skills;

            CREATE INDEX IF NOT EXISTS idx_skills_content_type ON skills(content_type);
            CREATE INDEX IF NOT EXISTS idx_skills_created_at ON skills(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_skills_is_featured ON skills(is_featured);
            CREATE INDEX IF NOT EXISTS idx_skills_source ON skills(source);
            CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
        """)


def _rebuild_fts(conn: sqlite3.Connection) -> None:
    """Rebuild FTS index for trigram tokenizer support."""
    # Drop and recreate FTS table with trigram tokenizer
    conn.execute("DROP TABLE IF EXISTS skills_fts")
    conn.execute("""
        CREATE VIRTUAL TABLE skills_fts USING fts5(
            title,
            description,
            tags,
            content,
            css_content,
            tokenize='trigram',
            content='skills',
            content_rowid='id'
        )
    """)

    # Re-populate FTS from existing skills
    conn.execute("""
        INSERT INTO skills_fts(rowid, title, description, tags, content, css_content)
        SELECT id, title, description, tags, content, css_content FROM skills
    """)

    # Re-create triggers
    conn.execute("""
        CREATE TRIGGER IF NOT EXISTS skills_ai AFTER INSERT ON skills BEGIN
            INSERT INTO skills_fts(rowid, title, description, tags, content, css_content)
            VALUES (new.id, new.title, new.description, new.tags, new.content, new.css_content);
        END
    """)
    conn.execute("""
        CREATE TRIGGER IF NOT EXISTS skills_ad AFTER DELETE ON skills BEGIN
            INSERT INTO skills_fts(skills_fts, rowid, title, description, tags, content, css_content)
            VALUES ('delete', old.id, old.title, old.description, old.tags, old.content, old.css_content);
        END
    """)
    conn.execute("""
        CREATE TRIGGER IF NOT EXISTS skills_au AFTER UPDATE ON skills BEGIN
            INSERT INTO skills_fts(skills_fts, rowid, title, description, tags, content, css_content)
            VALUES ('delete', old.id, old.title, old.description, old.tags, old.content, old.css_content);
            INSERT INTO skills_fts(rowid, title, description, tags, content, css_content)
            VALUES (new.id, new.title, new.description, new.tags, new.content, new.css_content);
        END
    """)


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        _migrate(conn)

        # Check if FTS needs rebuild (upgrade to trigram)
        fts_info = conn.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='skills_fts'"
        ).fetchone()
        if fts_info and "tokenize='trigram'" not in fts_info["sql"]:
            print("Upgrading FTS to trigram tokenizer for Chinese support...")
            _rebuild_fts(conn)

        # Re-apply schema to recreate FTS/triggers if migration dropped them
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()
