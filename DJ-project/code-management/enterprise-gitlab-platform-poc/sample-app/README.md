# sample-api

Small Flask API used to prove the golden path:

1. Run unit tests.
2. Scan code with SonarQube.
3. Run GitLab security scans and a Trivy image scan.
4. Build a container image.
5. Publish the image to Artifactory.
6. Update GitOps manifests so Argo CD deploys the new version.

Local test:

```bash
pip install -r requirements.txt pytest
pytest -q
docker build -t sample-api:local .
docker run --rm -p 8080:8080 sample-api:local
```

