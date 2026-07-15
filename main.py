"""
TechFynite Chatbot Backend (Gemini / Google AI edition)
=========================================================
A small FastAPI server that powers the custom chat widget on
techfynite.com. It talks to Google's Gemini API (free tier, no card
required) using the knowledge in knowledge_base.py, and saves any leads
a visitor shares.

Run locally:
    uvicorn main:app --reload --port 8000

Environment variables needed (see .env.example):
    GEMINI_API_KEY   - your free Google AI Studio API key
    ALLOWED_ORIGIN   - your website's URL, e.g. https://www.techfynite.com
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

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("techfynite-chatbot")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://www.techfynite.com")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")
LEADS_FILE = Path(__file__).parent / "leads.json"

if not GEMINI_API_KEY:
    logger.warning(
        "GEMINI_API_KEY is not set. The /chat endpoint will fail until "
        "you add it to your environment (see .env.example). Get a free "
        "key at https://aistudio.google.com/app/apikey"
    )
else:
    genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(title="TechFynite Chatbot API")

# Allow the widget to call this API from any origin. The widget doesn't
# use cookies/credentials, so a wildcard is safe here and avoids CORS
# headaches while testing from file://, localhost, different ports, etc.
# If you want to lock this down later, replace "*" with your exact
# domain(s), e.g. [ALLOWED_ORIGIN].
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    # Full conversation so far, oldest message first. The widget keeps
    # this in memory (per browser tab) and sends it with every request.
    messages: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


class LeadRequest(BaseModel):
    name: str
    email: EmailStr
    message: str | None = None
    source: str = "chatbot"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def to_gemini_history(messages: list[ChatMessage]) -> list[dict]:
    """
    Gemini expects role 'user' or 'model' (not 'assistant'), and each
    message wrapped as {"role": ..., "parts": [text]}.
    """
    gemini_history = []
    for m in messages:
        role = "model" if m.role == "assistant" else "user"
        gemini_history.append({"role": role, "parts": [m.content]})
    return gemini_history


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/")
def root():
    return {
        "name": "Techfynite AI API",
        "status": "Live",
        "version": "1.0"
    }

@app.get("/health")
def health_check():
    """Simple endpoint to confirm the server is alive - useful for uptime checks."""
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    """
    Takes the conversation so far and returns Gemini's next reply.
    The widget is responsible for keeping track of history and sending
    the full list back each time (this endpoint itself is stateless).
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server is not configured with a GEMINI_API_KEY.",
        )

    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    # Cap history length so a very long conversation doesn't blow up latency.
    trimmed_history = request.messages[-20:]

    # The last message is the new user turn; everything before it is history.
    *history_messages, latest_message = trimmed_history
    if latest_message.role != "user":
        raise HTTPException(
            status_code=400, detail="The last message must be from the user."
        )

    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_PROMPT,
        )
        chat_session = model.start_chat(history=to_gemini_history(history_messages))
        response = chat_session.send_message(latest_message.content)
        reply_text = (response.text or "").strip()
        return ChatResponse(reply=reply_text or "Sorry, I couldn't generate a reply.")
    except Exception as e:  # Gemini SDK raises several different exception types
        logger.exception("Gemini API error")
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}")


@app.post("/lead")
def capture_lead(lead: LeadRequest):
    """
    Saves a lead (name + email + optional message) collected mid-conversation.
    For a real production setup, swap this file-based storage for a proper
    database or send it straight to your CRM / Google Sheet / email inbox.
    """
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
            logger.warning("leads.json was corrupted, starting a fresh list.")
            leads = []

    leads.append(record)
    LEADS_FILE.write_text(json.dumps(leads, indent=2, ensure_ascii=False))

    logger.info("New lead captured: %s <%s>", lead.name, lead.email)
    return {"status": "saved"}
