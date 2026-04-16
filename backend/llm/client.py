import os
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str) -> str:
    """Load a prompt template from the prompts directory.

    Args:
        name: Name of the prompt file (without .txt extension)

    Returns:
        The content of the prompt template file

    Raises:
        FileNotFoundError: If the prompt file does not exist
    """
    prompt_path = PROMPTS_DIR / f"{name}.txt"
    return prompt_path.read_text(encoding="utf-8")


class LLMClient:
    """Unified LLM client supporting OpenAI, Anthropic, and Ollama.

    Configuration via environment variables:
        - ENABLE_AI: "true" or "false" to enable/disable AI features
        - LLM_PROVIDER: "openai", "anthropic", or "ollama"
        - LLM_MODEL: Model name (e.g., "gpt-4o-mini", "claude-3-5-sonnet-20241022")
        - LLM_API_KEY: API key for OpenAI or Anthropic
        - OLLAMA_BASE_URL: Base URL for Ollama (default: http://localhost:11434)
    """

    def __init__(self):
        """Initialize the LLM client with configuration from environment variables."""
        self.enabled = os.getenv("ENABLE_AI", "false").lower() == "true"
        self.provider = os.getenv("LLM_PROVIDER", "openai")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    def analyze(self, prompt: str) -> str:
        """Analyze text using the configured LLM provider.

        Args:
            prompt: The prompt text to send to the LLM

        Returns:
            The response from the LLM, or a message indicating that AI is disabled
        """
        if not self.enabled:
            return "[AI 功能未启用，请在 .env 中设置 ENABLE_AI=true]"

        if self.provider == "openai":
            return self._call_openai(prompt)
        elif self.provider == "anthropic":
            return self._call_anthropic(prompt)
        elif self.provider == "ollama":
            return self._call_ollama(prompt)
        else:
            return f"[不支持的 LLM_PROVIDER: {self.provider}]"

    def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API.

        Args:
            prompt: The prompt text

        Returns:
            The response content from OpenAI

        Raises:
            ImportError: If openai package is not installed
            Exception: If API call fails
        """
        try:
            from openai import OpenAI
        except ImportError:
            return "[OpenAI 库未安装，请运行: pip install openai]"

        try:
            client = OpenAI(api_key=self.api_key)
            resp = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                timeout=30,
            )
            return resp.choices[0].message.content
        except Exception as e:
            return f"[OpenAI API 调用失败: {str(e)}]"

    def _call_anthropic(self, prompt: str) -> str:
        """Call Anthropic API.

        Args:
            prompt: The prompt text

        Returns:
            The response content from Anthropic

        Raises:
            ImportError: If anthropic package is not installed
            Exception: If API call fails
        """
        try:
            import anthropic
        except ImportError:
            return "[Anthropic 库未安装，请运行: pip install anthropic]"

        try:
            client = anthropic.Anthropic(api_key=self.api_key)
            resp = client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            return resp.content[0].text
        except Exception as e:
            return f"[Anthropic API 调用失败: {str(e)}]"

    def _call_ollama(self, prompt: str) -> str:
        """Call Ollama API.

        Args:
            prompt: The prompt text

        Returns:
            The response content from Ollama

        Raises:
            ImportError: If httpx package is not installed
            Exception: If API call fails
        """
        try:
            import httpx
        except ImportError:
            return "[httpx 库未安装，请运行: pip install httpx]"

        try:
            resp = httpx.post(
                f"{self.ollama_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()["response"]
        except Exception as e:
            return f"[Ollama API 调用失败: {str(e)}]"
