import os

os.environ["ENABLE_AI"] = "false"

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_daily_summary_returns_disabled_message():
    """Test that daily-summary endpoint returns disabled message when AI is off"""
    response = client.get("/api/ai/daily-summary")
    assert response.status_code == 200
    data = response.json()
    assert "未启用" in data["result"]


def test_rebalance_returns_disabled_message():
    """Test that rebalance endpoint returns disabled message when AI is off"""
    response = client.post("/api/ai/rebalance")
    assert response.status_code == 200
    data = response.json()
    assert "未启用" in data["result"]
