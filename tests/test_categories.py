import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db, init_db

@pytest.fixture(autouse=True)
def setup_db():
    """Initialize test database before each test"""
    with get_db() as db:
        init_db(db)
    yield

client = TestClient(app)

def test_list_categories():
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6
    assert data[0]["name"] == "餐饮"

def test_category_has_required_fields():
    response = client.get("/api/categories")
    cat = response.json()[0]
    assert "id" in cat
    assert "name" in cat
    assert "color" in cat
    assert "icon" in cat
