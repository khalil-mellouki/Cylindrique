"""Database engine and session management.

`DATABASE_URL` selects the target. In production set it to the Supabase pooled
connection string (port 6543). When unset it falls back to a local SQLite file
so the API runs with zero setup during development.
"""

import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or "sqlite:///./cylindrique.db"

# Supabase provides a `postgresql://` URL; route it through psycopg (v3),
# which is the driver declared in requirements.txt.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    _connect_args = {"check_same_thread": False}
else:
    # Supabase's transaction pooler (pgbouncer) can't reuse server-side
    # prepared statements across pooled connections; disable psycopg's
    # auto-preparation to avoid "prepared statement already exists" errors.
    _connect_args = {"prepare_threshold": None}

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=not _is_sqlite,
    connect_args=_connect_args,
)


if _is_sqlite:
    # SQLite ignores foreign keys unless enabled per connection. Turn them on
    # so ON DELETE CASCADE behaves the same locally as it does on Postgres.
    @event.listens_for(Engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def init_db() -> None:
    """Create any missing tables. Importing models registers them on the
    shared SQLModel metadata before create_all runs."""
    import models  # noqa: F401  (side effect: registers table metadata)

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
