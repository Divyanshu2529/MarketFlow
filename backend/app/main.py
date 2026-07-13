from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.company import router as company_router


app = FastAPI(
    title="MarketFlow API",
    description="MarketFlow Platform Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(company_router)


@app.get("/")
def root():
    return {"message": "MarketFlow API is running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
