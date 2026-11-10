from fastapi import FastAPI

from app.routes.colis import router as colis_router


app = FastAPI(
    title="Colis Service API",
    description="API de gestion des colis et des numéros de suivi",
    version="1.0.0",
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
