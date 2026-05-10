"""WSGI wrapper for PythonAnywhere deployment."""
import sys
from pathlib import Path

# Add project root to path
project_home = Path(__file__).resolve().parent
if str(project_home) not in sys.path:
    sys.path.insert(0, str(project_home))

from a2wsgi import ASGIMiddleware
from app.main import app

application = ASGIMiddleware(app)
