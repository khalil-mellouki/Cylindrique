"""Project endpoints, nested under a team: list and create."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from database import get_session
from models import Project, Team
from schemas import ProjectCreate, ProjectRead

router = APIRouter(prefix="/api", tags=["projects"])


def _get_team_or_404(team_id: uuid.UUID, session: Session) -> Team:
    team = session.get(Team, team_id)
    if team is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.get("/teams/{team_id}/projects", response_model=list[ProjectRead])
def list_projects(team_id: uuid.UUID, session: Session = Depends(get_session)):
    _get_team_or_404(team_id, session)
    return session.exec(
        select(Project)
        .where(Project.team_id == team_id)
        .order_by(Project.created_at)
    ).all()


@router.post(
    "/teams/{team_id}/projects", response_model=ProjectRead, status_code=201
)
def create_project(
    team_id: uuid.UUID,
    payload: ProjectCreate,
    session: Session = Depends(get_session),
):
    _get_team_or_404(team_id, session)
    project = Project(team_id=team_id, name=payload.name)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project
