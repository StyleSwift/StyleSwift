import re


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    normalized = text.replace("\r\n", "\n")

    match = re.match(r"^---\n([\s\S]*?)\n---\n([\s\S]*)$", normalized)

    if not match:
        heading_match = re.match(r"^#\s+(.+)(?:\n|$)", normalized)
        name = heading_match.group(1).strip() if heading_match else "Unnamed"
        desc_match = re.search(r"^>\s*(.+)$", normalized, re.MULTILINE)
        description = desc_match.group(1).strip() if desc_match else ""
        return {"name": name, "description": description}, text.strip()

    frontmatter = match.group(1)
    body = match.group(2).strip()
    meta: dict[str, str] = {}

    for line in frontmatter.split("\n"):
        colon_index = line.find(":")
        if colon_index > 0:
            key = line[:colon_index].strip()
            value = line[colon_index + 1:].strip()
            meta[key] = value

    return meta, body


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")[:80]
