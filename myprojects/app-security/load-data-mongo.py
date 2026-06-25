import json
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://admin:admin123@localhost:27017")
db = client["mysbom-data"]
collection = db["packages"]

# Load your SBOM JSON file
with open("bom.cyclonedx.json") as f:
    sbom_data = json.load(f)

# CycloneDX packages are usually under 'components'
components = sbom_data.get("components", [])

# Prepare documents for MongoDB
docs = []
for comp in components:
    doc = {
        "name": comp.get("name"),
        "version": comp.get("version"),
        "purl": comp.get("purl"),
        # Take the first license if exists
        "license": comp.get("licenses", [{}])[0].get("license", {}).get("id") if comp.get("licenses") else None,
        "type": comp.get("type"),
        "cpe": comp.get("cpe")
    }
    docs.append(doc)

# Insert into MongoDB
if docs:
    collection.insert_many(docs)
    print(f"Inserted {len(docs)} packages into MongoDB.")
else:
    print("No packages found in SBOM.")

