import os
import pytest

# 确保 AI 功能禁用用于测试
os.environ["ENABLE_AI"] = "false"

from backend.llm.client import LLMClient, load_prompt


def test_load_prompt_daily_summary():
    """Test loading daily_summary prompt template"""
    prompt = load_prompt("daily_summary")
    assert "{transactions}" in prompt
    assert "{date}" in prompt
    assert "消费摘要" in prompt or "消费" in prompt


def test_load_prompt_rebalance():
    """Test loading rebalance prompt template"""
    prompt = load_prompt("rebalance")
    assert "{total_budget}" in prompt
    assert "{total_spent}" in prompt
    assert "{days_left}" in prompt


def test_llm_client_disabled():
    """Test that AI functionality returns disabled message when ENABLE_AI=false"""
    client = LLMClient()
    result = client.analyze("test prompt")
    assert "未启用" in result or "AI 功能未启用" in result


def test_llm_client_init_disabled():
    """Test LLMClient initializes with disabled status"""
    os.environ["ENABLE_AI"] = "false"
    client = LLMClient()
    assert client.enabled is False


def test_llm_client_init_enabled_config():
    """Test LLMClient configuration loading"""
    os.environ["ENABLE_AI"] = "false"
    os.environ["LLM_PROVIDER"] = "openai"
    os.environ["LLM_MODEL"] = "gpt-4o-mini"

    client = LLMClient()
    assert client.provider == "openai"
    assert client.model == "gpt-4o-mini"
    assert client.enabled is False
