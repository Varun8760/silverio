from fastapi import FastAPI

app = FastAPI(title= "Silverio")

@app.get("/health")
def health():
    return{"status": "ok"}