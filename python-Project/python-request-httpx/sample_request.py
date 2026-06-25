import httpx
import os

# Get creds safely from environment variables
# username = os.getenv("DOCKER_USER")
# password = os.getenv("DOCKER_PASS")
username = "perscoba"
password = "UCCso40240@"

# Step 1: Login to Docker Hub
login_url = "https://hub.docker.com/v2/users/login/"
resp = httpx.post(login_url, json={"username": username, "password": password})

if resp.status_code != 200:
    print("Login failed:", resp.text)
    exit()

data = resp.json()
token = data.get("token")
print("✅ Logged in. Got token:", token[:30] + "...")

# Step 2: Use the token in headers
headers = {"Authorization": f"JWT {token}"}

# Step 3: Get user profile (to confirm login)
profile_url = "https://hub.docker.com/v2/user/"
profile_resp = httpx.get(profile_url, headers=headers)
print("👤 Profile:", profile_resp.json())

# Step 4: List repositories for this user
repos_url = f"https://hub.docker.com/v2/repositories/{username}/"
repos_resp = httpx.get(repos_url, headers=headers)

if repos_resp.status_code == 200:
    repos = repos_resp.json()
    print("\n📦 Your repositories:")
    for repo in repos.get("results", []):
        print(f" - {repo['name']} (private: {repo['is_private']})")
else:
    print("Failed to fetch repos:", repos_resp.text)
