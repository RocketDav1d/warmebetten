from __future__ import annotations

import os
from typing import Any, Optional, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from scripts.env import load_dotenv

T = TypeVar("T", bound=BaseModel)


def call_openai_structured(
    *,
    schema: Type[T],
    user_text: str,
    system_prompt: str,
    model: str = "gpt-4o-2024-08-06",
    api_key: Optional[str] = None,
    temperature: float = 0.0,
    max_output_tokens: Optional[int] = None,
) -> T:
    """
    Call OpenAI with Structured Outputs and return a validated Pydantic object.

    Uses `client.responses.parse(...)` with `text_format=<PydanticModel>`.
    The SDK handles JSON schema generation and parsing automatically.
    """
    # Prefer explicit api_key; otherwise allow scripts/.env to supply OPENAI_API_KEY
    if api_key is None and os.getenv("OPENAI_API_KEY") is None:
        load_dotenv()

    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("Missing OpenAI API key. Set OPENAI_API_KEY or pass api_key=...")

    client = OpenAI(api_key=key)

    parse_kwargs: dict[str, Any] = {
        "model": model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
        "text_format": schema,
        "temperature": temperature,
    }
    if max_output_tokens is not None:
        parse_kwargs["max_output_tokens"] = max_output_tokens

    response = client.responses.parse(**parse_kwargs)

    parsed = response.output_parsed
    if parsed is None:
        raise RuntimeError("OpenAI response did not return a parsed object.")

    return parsed  # type: ignore[return-value]
