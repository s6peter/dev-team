import asyncio
import csv
import logging
from datetime import datetime
from typing import List, Dict, Any

import httpx
import pandas as pd
from pydantic import BaseModel, validator

# ---- Configuration ----

DATA_SOURCE_URL = "https://example.com/employee_records.csv"  
# Replace with actual URL for the synthetic dataset; or path on disk.

DLP_API_URL = "https://dlp-enforce.company.com:8443/ProtectManager/webservices/v1/directoryGroups"
API_TIMEOUT = 10

# Credentials (in enterprise env, read from secrets manager or env vars)
DLP_API_USER = "api_user"
DLP_API_PASSWORD = "SuperSecretPassword"

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# ---- Data Model ----

class Employee(BaseModel):
    employee_id: str
    name: str
    email: str
    department: str
    position: str
    status: str
    salary: float
    high_risk: bool = False

    @validator("email")
    def email_must_have_at(cls, v):
        if "@" not in v:
            raise ValueError("invalid email")
        return v.lower()

    @validator("salary")
    def salary_non_negative(cls, v):
        if v < 0:
            raise ValueError("salary must be non-negative")
        return v

# ---- Extract ----

async def fetch_csv_data(url: str) -> pd.DataFrame:
    """
    Fetches CSV from a URL (or could load local file), returns DataFrame.
    """
    logger.info(f"Fetching data from {url}")
    async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        content = resp.content.decode("utf-8")
    df = pd.read_csv(pd.compat.StringIO(content))
    logger.info(f"Fetched {len(df)} rows")
    return df

# ---- Transform ----

def transform_df(df: pd.DataFrame) -> List[Employee]:
    """
    Clean, filter, and transform the raw DataFrame into list of Employee models.
    """
    logger.info("Starting transformation")

    # Normalize column names
    df = df.rename(columns=lambda c: c.strip().lower().replace(" ", "_"))
    # Expected columns might be: employee_id, employee_name, age, country, department, position, salary, joining_date, status, etc.

    # Example filters:
    # - Keep only active employees
    if "status" in df.columns:
        df = df[df["status"].str.lower() == "active"]
    else:
        logger.warning("No status column; skipping filter for active employees")

    # - Focus on high-risk departments: e.g. Finance or R&D
    high_risk_departments = {"finance", "rd", "research & development", "product_security"}
    df["high_risk"] = df["department"].apply(
        lambda d: True if isinstance(d, str) and d.strip().lower() in high_risk_departments else False
    )

    # Create Employee models
    employees: List[Employee] = []
    for _, row in df.iterrows():
        try:
            emp = Employee(
                employee_id=str(row.get("employee_id", "")).strip(),
                name=str(row.get("employee_name", "")).strip(),
                email=str(row.get("email", "")).strip(),
                department=str(row.get("department", "")).strip(),
                position=str(row.get("position", "")).strip(),
                status=str(row.get("status", "active")).strip(),
                salary=float(row.get("salary", 0.0)),
                high_risk=bool(row.get("high_risk", False))
            )
            employees.append(emp)
        except Exception as e:
            logger.warning(f"Skipping row due to validation error: {e}; row data: {row.to_dict()}")

    logger.info(f"Transformed into {len(employees)} Employee records")
    return employees

# ---- Load ----

async def load_to_dlp(employees: List[Employee]) -> None:
    """
    Load employee data to DLP API, e.g., update directory group or user attributes.
    Sends batch or individual requests as needed.
    """
    logger.info(f"Uploading {len(employees)} employees to DLP")

    async with httpx.AsyncClient(timeout=API_TIMEOUT, auth=(DLP_API_USER, DLP_API_PASSWORD), verify=False) as client:
        for emp in employees:
            payload = {
                "employeeId": emp.employee_id,
                "email": emp.email,
                "department": emp.department,
                "position": emp.position,
                "highRisk": emp.high_risk,
                "salary": emp.salary
            }
            try:
                resp = await client.post(DLP_API_URL, json=payload)
                if resp.status_code == 200:
                    logger.debug(f"Uploaded: {emp.employee_id}")
                else:
                    logger.error(f"Failed to upload {emp.employee_id}: {resp.status_code} {resp.text}")
            except Exception as e:
                logger.error(f"Error while uploading {emp.employee_id}: {e}")

# ---- Orchestrator ----

async def main():
    # Step 1: Extract
    try:
        df = await fetch_csv_data(DATA_SOURCE_URL)
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return

    # Step 2: Transform
    employees = transform_df(df)

    if not employees:
        logger.warning("No valid employee records after transformation; exiting")
        return

    # Step 3: Load
    await load_to_dlp(employees)

if __name__ == "__main__":
    asyncio.run(main())
