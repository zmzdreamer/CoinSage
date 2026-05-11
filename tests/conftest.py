"""
Shared fixtures for CoinSage test suite.

All API tests use `app_client` which:
1. Creates a temp SQLite DB
2. Patches backend.database.DB_PATH so all get_db() calls hit it
3. Spins up a TestClient (which triggers lifespan → init_db)
4. Registers a test user and returns (client, auth_headers)
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def app_client():
    """Provides a TestClient with a fresh DB and an authenticated test user."""
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)

    import backend.database as db_module
    original_path = db_module.DB_PATH
    db_module.DB_PATH = db_path

    # init_db on the temp file so tables exist before TestClient starts
    with db_module.get_db(db_path) as db:
        db_module.init_db(db)

    # Import app after patching DB_PATH so lifespan uses the right path
    from backend.main import app
    client = TestClient(app)

    # Register the first (owner) user
    r = client.post(
        "/api/auth/register",
        json={"username": "tester", "password": "tester123"},
    )
    assert r.status_code == 201, f"Registration failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    yield client, headers

    # Restore original DB_PATH and clean up temp file
    db_module.DB_PATH = original_path
    try:
        os.unlink(db_path)
    except OSError:
        pass
