"""Note endpoints: list/create under a project, update/delete by id."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from database import get_session
from models import Note, Project, utcnow
from schemas import NoteCreate, NoteRead, NoteUpdate

router = APIRouter(prefix="/api", tags=["notes"])


def _get_project_or_404(project_id: uuid.UUID, session: Session) -> Project:
    project = session.get(Project, project_id)
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _get_note_or_404(note_id: uuid.UUID, session: Session) -> Note:
    note = session.get(Note, note_id)
    if note is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.get("/projects/{project_id}/notes", response_model=list[NoteRead])
def list_notes(project_id: uuid.UUID, session: Session = Depends(get_session)):
    _get_project_or_404(project_id, session)
    return session.exec(
        select(Note).where(Note.project_id == project_id).order_by(Note.created_at)
    ).all()


@router.post(
    "/projects/{project_id}/notes", response_model=NoteRead, status_code=201
)
def create_note(
    project_id: uuid.UUID,
    payload: NoteCreate,
    session: Session = Depends(get_session),
):
    _get_project_or_404(project_id, session)
    note = Note(project_id=project_id, title=payload.title, content=payload.content)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.put("/notes/{note_id}", response_model=NoteRead)
def update_note(
    note_id: uuid.UUID,
    payload: NoteUpdate,
    session: Session = Depends(get_session),
):
    note = _get_note_or_404(note_id, session)
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    for field, value in updates.items():
        setattr(note, field, value)
    note.updated_at = utcnow()
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, session: Session = Depends(get_session)):
    note = _get_note_or_404(note_id, session)
    session.delete(note)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
