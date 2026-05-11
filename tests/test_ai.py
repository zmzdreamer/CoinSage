import pytest


def test_daily_summary_returns_disabled_message(app_client):
    """Test that daily-summary endpoint returns disabled message when AI is off"""
    client, headers = app_client
    response = client.get("/api/ai/daily-summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "未启用" in data["result"]


def test_rebalance_returns_disabled_message(app_client):
    """Test that rebalance endpoint returns disabled message when AI is off"""
    client, headers = app_client
    response = client.post("/api/ai/rebalance", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "未启用" in data["result"]
