# Backend

Standalone FastAPI backend for the `teach agent`, `flashcard agent`, and `test agent`.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API expects `YOUTUBE_API_KEY` to be available in the environment for the teach agent endpoint.
The API expects `GEMINI_API_KEY` to be available in the environment for the flashcard and test agent endpoints.

## Endpoints

- `POST /api/teach-agent`
- `POST /api/flashcard-agent`
- `POST /api/test-agent`

Interactive docs are available at `http://127.0.0.1:8000/docs`.
