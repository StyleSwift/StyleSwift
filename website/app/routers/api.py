from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from app.services import skill_service, search_service

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/search")
async def search(
    q: str = Query(default=""),
    content_type: str = Query(default=""),
    tag: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    if q.strip():
        skills, total = search_service.search_skills(
            q, content_type or None, tag or None, page, per_page
        )
    else:
        skills, total = skill_service.list_skills(
            content_type or None, tag or None, "latest", page, per_page
        )

    return {
        "skills": [s.model_dump() for s in skills],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/tags")
async def tags():
    return {"tags": search_service.get_all_tags()}


@router.post("/skill/{slug}/install")
async def install_skill(slug: str):
    success = skill_service.increment_downloads(slug)
    if not success:
        return JSONResponse({"error": "Skill not found"}, status_code=404)
    return {"success": True}


@router.get("/skill/{slug}/raw")
async def raw_skill(slug: str):
    skill = skill_service.get_skill_by_slug(slug)
    if not skill:
        return JSONResponse({"error": "Skill not found"}, status_code=404)
    return {
        "slug": skill.slug,
        "title": skill.title,
        "description": skill.description,
        "content_type": skill.content_type,
        "content": skill.content,
        "css_content": skill.css_content,
        "example_url": skill.example_url,
        "tags": skill.tags,
    }
