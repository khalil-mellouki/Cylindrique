"""Request/response schemas.

Kept separate from the table models so the API contract is explicit: clients
can only set the fields listed here, never server-managed columns like `id`,
`created_at`, or `updated_at`.
"""

import uuid
from datetime import datetime, timezone

from pydantic import field_serializer
from sqlmodel import Field, SQLModel


class _UTCTimestamps(SQLModel):
    """Serialize datetime columns as UTC ISO strings (with a timezone offset).

    The values are stored as UTC but read back as naive datetimes; without this
    a client would parse them as local time and get the wrong relative times.
    """

    @field_serializer("created_at", "updated_at", check_fields=False)
    def _serialize_timestamps(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()


# --- Team ---
class TeamCreate(SQLModel):
    name: str = Field(min_length=1, max_length=120)


class TeamRead(_UTCTimestamps):
    id: uuid.UUID
    name: str
    created_at: datetime


# --- Project ---
class ProjectCreate(SQLModel):
    name: str = Field(min_length=1, max_length=120)


class ProjectRead(_UTCTimestamps):
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


class NoteRead(_UTCTimestamps):
    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
