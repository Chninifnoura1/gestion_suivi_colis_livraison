
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models
from app.routes.livraison import router as livraison_router
from app.routes.livraison_colis import router as livraison_colis_router
from app.routes.dashboard import router as dashboard_router

app = FastAPI(
    title="Livraison Service API",
    description="API de gestion des livraisons et de leur association aux colis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "service": "livraison-service",
        "status": "healthy",
    }


app.include_router(livraison_router)
app.include_router(livraison_colis_router)
app.include_router(dashboard_router)