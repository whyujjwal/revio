"""Entry point for the LiveKit voice agent worker.

Usage:
    cd apps/api
    uv run python -m app.scripts.run_livekit_agent
"""

from app.services.livekit_agent import run_agent

if __name__ == "__main__":
    run_agent()
