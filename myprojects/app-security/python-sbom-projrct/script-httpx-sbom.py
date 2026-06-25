# # # import boto3

# # def get_s3_file(bucket_name, object_key, region="us-east-1"):
# #     s3 = boto3.client("s3", region_name=region)
# #     response = s3.get_object(Bucket=bucket_name, Key=object_key)
# #     return response["Body"].read()

# # if __name__ == "__main__":
# #     bucket_name = "sbom-data-bucket"
# #     object_key = "bom.cyclonedx.json"

# #     file_data = get_s3_file(bucket_name, object_key)
# #     print(file_data.decode("utf-8"))

# #!/usr/bin/env python3
# import logging
# import httpx
# import boto3
# from botocore.exceptions import BotoCoreError, ClientError

# # ----------------------------
# # Logging configuration
# # ----------------------------
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
# )
# logger = logging.getLogger("s3_downloader")

# # ----------------------------
# # Functions
# # ----------------------------
# def get_presigned_url(bucket_name: str, object_key: str, region: str = "us-east-1", expires_in: int = 3600) -> str:
#     """
#     Generate a presigned URL for a private S3 object.
#     """
#     try:
#         s3 = boto3.client("s3", region_name=region)
#         url = s3.generate_presigned_url(
#             "get_object",
#             Params={"Bucket": bucket_name, "Key": object_key},
#             ExpiresIn=expires_in
#         )
#         logger.info(f"Generated presigned URL for {bucket_name}/{object_key}")
#         return url
#     except (BotoCoreError, ClientError) as e:
#         logger.error(f"Failed to generate presigned URL: {e}")
#         raise

# def fetch_file_from_s3(bucket_name: str, object_key: str, region: str = "us-east-1") -> bytes:
#     """
#     Fetch a file from S3 using a presigned URL and httpx.
#     """
#     try:
#         url = get_presigned_url(bucket_name, object_key, region)
#         logger.info(f"Fetching {url}")
#         response = httpx.get(url, timeout=30.0)
#         response.raise_for_status()
#         logger.info(f"Successfully fetched {object_key}")
#         return response.content
#     except httpx.HTTPStatusError as e:
#         logger.error(f"HTTP error: {e.response.status_code} for URL {e.request.url}")
#         raise
#     except httpx.RequestError as e:
#         logger.error(f"Request error: {e}")
#         raise

# # ----------------------------
# # Main script
# # ----------------------------
# if __name__ == "__main__":
#     BUCKET_NAME = "sbom-data-bucket"
#     OBJECT_KEY = "bom.cyclonedx.json"
#     REGION = "us-east-1"

#     try:
#         file_data = fetch_file_from_s3(BUCKET_NAME, OBJECT_KEY, REGION)
#         # Save to local file
#         with open("bom.cyclonedx.json", "wb") as f:
#             f.write(file_data)
#         logger.info(f"File saved locally as bom.cyclonedx.json")
#     except Exception as e:
#         logger.error(f"Failed to download file: {e}")




# import json
# from collections import Counter
# import matplotlib.pyplot as plt

# # ----------------------------
# # 1. Load SBOM JSON
# # ----------------------------
# with open("bom.cyclonedx.json") as f:
#     sbom = json.load(f)

# # ----------------------------
# # 2. Extract license IDs
# # ----------------------------
# licenses = []

# for component in sbom.get("components", []):
#     component_licenses = component.get("licenses")
#     if component_licenses:
#         for lic in component_licenses:
#             # Some licenses are dicts with 'id'
#             lic_id = lic.get("license", {}).get("id")
#             if lic_id:
#                 licenses.append(lic_id)
#             else:
#                 licenses.append("Unknown")
#     else:
#         licenses.append("Unknown")

# # ----------------------------
# # 3. Count licenses
# # ----------------------------
# license_counts = Counter(licenses)

# # ----------------------------
# # 4. Plot bar chart
# # ----------------------------
# plt.figure(figsize=(12, 6))
# plt.bar(license_counts.keys(), license_counts.values(), color='skyblue')
# plt.xlabel('License Type')
# plt.ylabel('Number of Packages')
# plt.title('SBOM License Distribution')
# plt.xticks(rotation=45, ha='right')
# plt.tight_layout()
# plt.show()





# import json
# from collections import Counter
# import matplotlib.pyplot as plt

# # ----------------------------
# # 1. Load SBOM JSON
# # ----------------------------
# with open("bom.cyclonedx.json") as f:
#     sbom = json.load(f)

# # ----------------------------
# # 2. Extract license IDs
# # ----------------------------
# licenses = []

# for component in sbom.get("components", []):
#     component_licenses = component.get("licenses")
#     if component_licenses:
#         for lic in component_licenses:
#             lic_id = lic.get("license", {}).get("id")
#             licenses.append(lic_id if lic_id else "Unknown")
#     else:
#         licenses.append("Unknown")

# # ----------------------------
# # 3. Count licenses
# # ----------------------------
# license_counts = Counter(licenses)

# # Sort by count descending
# sorted_licenses = dict(sorted(license_counts.items(), key=lambda item: item[1], reverse=True))

# # ----------------------------
# # 4. Plot bar chart
# # ----------------------------
# plt.figure(figsize=(14, 7))

# bars = plt.bar(sorted_licenses.keys(), sorted_licenses.values(), color='skyblue', edgecolor='black')

# # Add value labels on top of bars
# for bar in bars:
#     height = bar.get_height()
#     plt.text(bar.get_x() + bar.get_width()/2.0, height, f'{height}', ha='center', va='bottom')

# plt.xlabel('License Type', fontsize=12)
# plt.ylabel('Number of Packages', fontsize=12)
# plt.title('SBOM License Distribution', fontsize=16)
# plt.xticks(rotation=45, ha='right', fontsize=10)
# plt.yticks(fontsize=10)
# plt.grid(axis='y', linestyle='--', alpha=0.7)
# plt.tight_layout()

# # Save chart to file
# plt.savefig("sbom_license_distribution.png", dpi=300)
# plt.show()




def recurs(n):
    if n ==0:
        return 1
    else:
        return n*recurs(n-1)
fac = recurs(0)  
print(fac)
