from app import app


def test_health_endpoint():
    client = app.test_client()
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "healthy"


def test_home_endpoint_identifies_platform():
    client = app.test_client()
    response = client.get("/")
    payload = response.get_json()

    assert response.status_code == 200
    assert payload["service"] == "sample-api"
    assert payload["platform"] == "enterprise-gitlab-software-factory"

