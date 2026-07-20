"""
Backend for the Techfynite chat widget.
Talks to Gemini using the persona/rules in knowledge_base.py.

Run locally:
    uvicorn main:app --reload --port 8000

Needs GEMINI_API_KEY set (see .env.example).
"""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv
import google.generativeai as genai

from knowledge_base import SYSTEM_PROMPT

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("techfynite-chatbot")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://www.techfynite.com")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")
LEADS_FILE = Path(__file__).parent / "leads.json"

if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set - /chat will fail until it's added to .env")
else:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="Techfynite Chatbot API")

# Wide open on purpose - no cookies/credentials involved, and it saves us
# from CORS headaches while testing from different local ports.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


class LeadRequest(BaseModel):
    name: str
    email: EmailStr
    message: str | None = None
    source: str = "chatbot"


def to_gemini_history(messages: list[ChatMessage]) -> list[dict]:
    # Gemini wants "model" instead of "assistant", and a different shape.
    gemini_history = []
    for m in messages:
        role = "model" if m.role == "assistant" else "user"
        gemini_history.append({"role": role, "parts": [m.content]})
    return gemini_history


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Server missing GEMINI_API_KEY.")

    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    # keep only the last 20 messages so long chats don't slow things down
    trimmed_history = request.messages[-20:]

    *history_messages, latest_message = trimmed_history
    if latest_message.role != "user":
        raise HTTPException(status_code=400, detail="Last message must be from the user.")

    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_PROMPT,
        )
        chat_session = model.start_chat(history=to_gemini_history(history_messages))
        response = chat_session.send_message(latest_message.content)
        reply_text = (response.text or "").strip()
        return ChatResponse(reply=reply_text or "Sorry, I couldn't generate a reply.")
    except Exception as e:
        logger.exception("Gemini API error")
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}")


@app.post("/lead")
def capture_lead(lead: LeadRequest):
    # Simple file-based storage for now. Swap for a real DB / Sheet / CRM
    # once there's actual traffic to worry about.
    record = {
        "name": lead.name,
        "email": lead.email,
        "message": lead.message,
        "source": lead.source,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    leads = []
    if LEADS_FILE.exists():
        try:
            leads = json.loads(LEADS_FILE.read_text())
        except json.JSONDecodeError:
            logger.warning("leads.json was corrupted, starting fresh.")
            leads = []

    leads.append(record)
    LEADS_FILE.write_text(json.dumps(leads, indent=2, ensure_ascii=False))

    logger.info("New lead: %s <%s>", lead.name, lead.email)
    return {"status": "saved"}
