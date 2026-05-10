import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "styleswift.db"
SKILLS_DIR = BASE_DIR / "skills"
TEMPLATES_DIR = BASE_DIR / "app" / "templates"
STATIC_DIR = BASE_DIR / "app" / "static"

DEBUG = os.getenv("STYLESWIFT_DEBUG", "0") == "1"
HOST = os.getenv("STYLESWIFT_HOST", "0.0.0.0")
PORT = int(os.getenv("STYLESWIFT_PORT", "8000"))
