from flask import Flask, jsonify

app = Flask(__name__)


@app.get("/")
def home():
    return jsonify(
        service="sample-api",
        platform="enterprise-gitlab-software-factory",
        owner="application-teams",
        status="ok",
    )


@app.get("/health")
def health():
    return jsonify(status="healthy")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)

