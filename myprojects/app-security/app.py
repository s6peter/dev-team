from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List

# Connect to MongoDB
client = MongoClient("mongodb://admin:admin123@localhost:27017")
db = client["mysbom-data"]
collection = db["packages"]

# FastAPI app
app = FastAPI(title="SBOM API")

# Pydantic model for response
class Package(BaseModel):
    name: str
    version: str | None = None
    license: str | None = None
    type: str | None = None
    purl: str | None = None
    cpe: str | None = None

# Root endpoint
@app.get("/")
def root():
    return {"message": "SBOM API is running!"}

# Get all packages
@app.get("/packages", response_model=List[Package])
def get_packages():
    packages = list(collection.find({}, {"_id": 0}))
    return packages

# Get a specific package by name (case-insensitive)
@app.get("/packages/{package_name}", response_model=Package)
def get_package(package_name: str):
    package = collection.find_one(
        {"name": {"$regex": f"^{package_name}$", "$options": "i"}},  # regex for case-insensitive match
        {"_id": 0}
    )
    if package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    return package

