
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.colis import router as colis_router


app = FastAPI(
    title="Colis Service API",
    description="API de gestion des colis et des numéros de suivi",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "service": "colis-service",
        "status": "healthy",
    }


# Register colis routes
app.include_router(colis_router)
