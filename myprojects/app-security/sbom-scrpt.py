import json
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://admin:admin123@localhost:27017")
db = client["mysbom-data"]
collection = db["packages"]

# Load SBOM JSON
with open("bom.cyclonedx.json") as f:
    sbom_data = json.load(f)

# Insert documents
if isinstance(sbom_data, list):
    collection.insert_many(sbom_data)
else:
    collection.insert_one(sbom_data)

print("SBOM data inserted successfully!")

