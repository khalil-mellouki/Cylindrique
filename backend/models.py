"""SQLModel table definitions for Cylindrique.

The data hierarchy is Team -> Project -> Note. Foreign keys cascade on delete
so removing a parent cleans up its children automatically.
"""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    """Timezone-aware UTC timestamp, used as a column default."""
    return datetime.now(timezone.utc)


class Team(SQLModel, table=True):
    __tablename__ = "teams"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    created_at: datetime = Field(default_factory=utcnow)


class Project(SQLModel, table=True):
    __tablename__ = "projects"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    team_id: uuid.UUID = Field(
        foreign_key="teams.id", ondelete="CASCADE", index=True
    )
    name: str
    created_at: datetime = Field(default_factory=utcnow)


class Note(SQLModel, table=True):
    __tablename__ = "notes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(
        foreign_key="projects.id", ondelete="CASCADE", index=True
    )
    title: str
    content: str = Field(default="")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
