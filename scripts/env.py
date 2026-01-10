from __future__ import annotations

from pathlib import Path


def load_dotenv(path: str | Path | None = None) -> None:
    """
    Minimal .env loader (KEY=VALUE lines, supports quotes and comments).
    Does not override already-set environment variables.
    """
    import os

    dotenv_path = Path(path) if path is not None else (Path(__file__).resolve().parent / ".env")
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        # strip optional quotes
        if len(value) >= 2 and ((value[0] == value[-1] == '"') or (value[0] == value[-1] == "'")):
            value = value[1:-1]

        if key and key not in os.environ:
            os.environ[key] = value


