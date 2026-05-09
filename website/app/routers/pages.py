from urllib.parse import quote_plus

from fastapi import APIRouter, Request, Form, Query
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates

from app.config import TEMPLATES_DIR
from app.models import SkillCreate
from app.services import skill_service, search_service
from app.services.frontmatter_parser import parse_frontmatter

router = APIRouter()

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@router.get("/", response_class=HTMLResponse)
async def homepage(request: Request):
    featured = skill_service.get_featured_skills(6)
    latest = skill_service.get_latest_skills(12)
    stats = skill_service.get_stats()
    tags = search_service.get_all_tags()[:20]
    return templates.TemplateResponse(request, "index.html", {
        "featured": featured,
        "latest": latest,
        "stats": stats,
        "tags": tags,
    })


@router.get("/browse", response_class=HTMLResponse)
async def browse(
    request: Request,
    q: str = Query(default=""),
    content_type: str = Query(default=""),
    tag: str = Query(default=""),
    sort: str = Query(default="latest"),
    page: int = Query(default=1, ge=1),
):
    per_page = 20

    if q.strip():
        skills, total = search_service.search_skills(q, content_type or None, tag or None, page, per_page)
    else:
        skills, total = skill_service.list_skills(content_type or None, tag or None, sort, page, per_page)

    total_pages = max(1, (total + per_page - 1) // per_page)
    tags = search_service.get_all_tags()

    return templates.TemplateResponse(request, "browse.html", {
        "skills": skills,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
        "q": q,
        "content_type": content_type,
        "tag": tag,
        "sort": sort,
        "tags": tags,
    })


@router.get("/skill/{slug}", response_class=HTMLResponse)
async def detail(request: Request, slug: str):
    skill = skill_service.get_skill_by_slug(slug)
    if not skill:
        return templates.TemplateResponse(request, "404.html", {}, status_code=404)

    related = skill_service.get_related_skills(slug, 4)

    rendered_content = None
    if skill.content:
        import markdown
        rendered_content = markdown.markdown(
            skill.content,
            extensions=["fenced_code", "codehilite", "tables", "nl2br"],
        )

    return templates.TemplateResponse(request, "detail.html", {
        "skill": skill,
        "rendered_content": rendered_content,
        "related": related,
    })


@router.get("/upload", response_class=HTMLResponse)
async def upload_form(request: Request):
    return templates.TemplateResponse(request, "upload.html", {
        "errors": {},
        "form_data": {},
    })


@router.post("/upload", response_class=HTMLResponse)
async def upload_submit(
    request: Request,
    title: str = Form(default=""),
    description: str = Form(default=""),
    dna_content: str = Form(default=""),
    css_content: str = Form(default=""),
    example_url: str = Form(default=""),
    tags: str = Form(default=""),
    author_name: str = Form(default="Anonymous"),
):
    errors: dict[str, str] = {}

    dna = dna_content.strip()
    css = css_content.strip()

    if not dna and not css:
        errors["content"] = "Please provide Style DNA, CSS Snippet, or both"

    if dna:
        meta, _ = parse_frontmatter(dna)
        if not title.strip() and not meta.get("name"):
            errors["title"] = "Title is required (or include name in frontmatter)"
    elif not title.strip():
        errors["title"] = "Title is required"

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags.strip() else []

    if errors:
        form_data = {
            "title": title,
            "description": description,
            "dna_content": dna_content,
            "css_content": css_content,
            "example_url": example_url,
            "tags": tags,
            "author_name": author_name,
        }
        return templates.TemplateResponse(request, "upload.html", {
            "errors": errors,
            "form_data": form_data,
        })

    skill_data = SkillCreate(
        title=title.strip(),
        description=description.strip(),
        content=dna or None,
        css_content=css or None,
        example_url=example_url.strip() or None,
        tags=tag_list,
        author_name=author_name.strip() or "Anonymous",
    )

    skill = skill_service.create_skill(skill_data)
    return RedirectResponse(url=f"/skill/{skill.slug}", status_code=303)


@router.get("/download/{slug}")
async def download_skill(request: Request, slug: str):
    skill = skill_service.get_skill_by_slug(slug)
    if not skill:
        return templates.TemplateResponse(request, "404.html", {}, status_code=404)

    if skill.content_type == "mixed":
        # Combine both parts
        parts = []
        if skill.content:
            parts.append(skill.content)
        if skill.css_content:
            parts.append("/* CSS Snippet */\n" + skill.css_content)
        content = "\n\n".join(parts)
        filename = f"{slug}.md"
        media_type = "text/markdown"
    elif skill.content_type == "css_snippet":
        content = skill.css_content or skill.content or ""
        filename = f"{slug}.css"
        media_type = "text/css"
    else:
        content = skill.content or ""
        filename = f"{slug}.md"
        media_type = "text/markdown"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/install/{slug}", response_class=HTMLResponse)
async def install_page(request: Request, slug: str):
    skill = skill_service.get_skill_by_slug(slug)
    if not skill:
        return templates.TemplateResponse(request, "404.html", {}, status_code=404)

    return templates.TemplateResponse(request, "install.html", {
        "skill": skill,
    })
