from __future__ import annotations

import os
from typing import Any, Iterable, Optional, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel

from scripts.env import load_dotenv

T = TypeVar("T", bound=BaseModel)


def _enforce_openai_required_all_properties(schema: Any) -> Any:
    """
    OpenAI Structured Outputs (strict JSON schema) requires:
    - For every object schema: `required` must be present and contain *every* key in `properties`.
    We enforce that recursively across the entire schema (including $defs).
    """
    if isinstance(schema, list):
        return [_enforce_openai_required_all_properties(x) for x in schema]
    if not isinstance(schema, dict):
        return schema

    # Recurse first
    for k, v in list(schema.items()):
        schema[k] = _enforce_openai_required_all_properties(v)

    if schema.get("type") == "object" and isinstance(schema.get("properties"), dict):
        props: dict[str, Any] = schema["properties"]
        all_keys = list(props.keys())
        required = schema.get("required")
        if not isinstance(required, list):
            schema["required"] = all_keys
        else:
            # ensure required includes every property key
            req_set = set(required)
            for key in all_keys:
                if key not in req_set:
                    required.append(key)
            schema["required"] = required

    return schema


def _pydantic_json_schema(model_cls: Type[BaseModel]) -> dict[str, Any]:
    """
    Return a JSON schema dict for a Pydantic model across v1/v2.
    """
    if hasattr(model_cls, "model_json_schema"):  # pydantic v2
        return model_cls.model_json_schema()
    # pydantic v1 fallback
    return model_cls.schema()  # type: ignore[attr-defined]


def _extract_output_text(response: Any) -> str:
    """
    Best-effort extraction of text from an OpenAI Responses API response object.
    """
    # New SDKs typically expose `.output_text`
    output_text = getattr(response, "output_text", None)
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    # Fallback: iterate through `response.output[*].content[*]`
    out_items: Iterable[Any] = getattr(response, "output", []) or []
    chunks: list[str] = []

    for item in out_items:
        content = None
        if isinstance(item, dict):
            content = item.get("content", [])
        else:
            content = getattr(item, "content", None)

        if not content:
            continue

        for c in content:
            if isinstance(c, dict):
                if c.get("type") == "output_text" and isinstance(c.get("text"), str):
                    chunks.append(c["text"])
            else:
                if getattr(c, "type", None) == "output_text" and isinstance(getattr(c, "text", None), str):
                    chunks.append(c.text)

    return "".join(chunks).strip()


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
    Call OpenAI with Structured Outputs (JSON Schema, strict) and return a validated Pydantic object.

    Uses the Responses API and validates the returned JSON via Pydantic.
    """
    # Prefer explicit api_key; otherwise allow scripts/.env to supply OPENAI_API_KEY
    if api_key is None and os.getenv("OPENAI_API_KEY") is None:
        load_dotenv()

    key = api_key or os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("Missing OpenAI API key. Set OPENAI_API_KEY or pass api_key=...")

    client = OpenAI(api_key=key)
    json_schema = _pydantic_json_schema(schema)
    json_schema = _enforce_openai_required_all_properties(json_schema)

    create_kwargs: dict[str, Any] = {
        "model": model,
        "input": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text},
        ],
        "temperature": temperature,
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema.__name__,
                "schema": json_schema,
                "strict": True,
            }
        },
    }
    if max_output_tokens is not None:
        create_kwargs["max_output_tokens"] = max_output_tokens

    response = client.responses.create(**create_kwargs)
    output_json = _extract_output_text(response)
    if not output_json:
        raise RuntimeError("OpenAI response did not contain output_text.")

    # Pydantic v2: model_validate_json; v1: parse_raw
    if hasattr(schema, "model_validate_json"):
        return schema.model_validate_json(output_json)  # type: ignore[attr-defined]
    return schema.parse_raw(output_json)  # type: ignore[attr-defined]


