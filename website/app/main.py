from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import STATIC_DIR, DEBUG, HOST, PORT
from app.database import init_db
from app.routers import pages, api


def create_app() -> FastAPI:
    app = FastAPI(title="StyleSwift Community", debug=DEBUG)
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    init_db()

    app.include_router(pages.router)
    app.include_router(api.router, prefix="/api")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEBUG)
