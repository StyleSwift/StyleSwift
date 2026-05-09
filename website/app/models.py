from pydantic import BaseModel, Field, model_validator
from typing import Optional


class SkillCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    content: Optional[str] = Field(default=None)
    css_content: Optional[str] = Field(default=None)
    example_url: Optional[str] = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list)
    author_name: str = Field(default="Anonymous", max_length=100)

    @model_validator(mode="after")
    def validate_content(self) -> "SkillCreate":
        has_dna = bool(self.content and self.content.strip())
        has_css = bool(self.css_content and self.css_content.strip())
        if not has_dna and not has_css:
            raise ValueError("At least one of content or css_content is required")
        return self

    @property
    def content_type(self) -> str:
        has_dna = bool(self.content and self.content.strip())
        has_css = bool(self.css_content and self.css_content.strip())
        if has_dna and has_css:
            return "mixed"
        if has_css:
            return "css_snippet"
        return "style_dna"


class SkillResponse(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    content_type: str
    content: Optional[str]
    css_content: Optional[str]
    example_url: Optional[str]
    tags: list[str]
    author_name: str
    downloads_count: int
    is_featured: bool
    source: str
    created_at: str


class SkillCard(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    content_type: str
    has_css: bool = False
    tags: list[str]
    author_name: str
    downloads_count: int
    is_featured: bool
    source: str
    created_at: str


class SearchResult(BaseModel):
    skills: list[SkillCard]
    total: int
    page: int
    per_page: int
