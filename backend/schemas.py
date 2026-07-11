"""Request/response schemas.

Kept separate from the table models so the API contract is explicit: clients
can only set the fields listed here, never server-managed columns like `id`,
`created_at`, or `updated_at`.
"""

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


# --- Team ---
class TeamCreate(SQLModel):
    name: str = Field(min_length=1, max_length=120)


class TeamRead(SQLModel):
    id: uuid.UUID
    name: str
    created_at: datetime


# --- Project ---
class ProjectCreate(SQLModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectRead(SQLModel):
    id: uuid.UUID
    team_id: uuid.UUID
    name: str
    created_at: datetime


# --- Note ---
class NoteCreate(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = ""


class NoteUpdate(SQLModel):
    """All fields optional — supports partial updates."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = None


class NoteRead(SQLModel):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
