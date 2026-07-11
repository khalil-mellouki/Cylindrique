"""Team endpoints: list and create."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import get_session
from models import Team
from schemas import TeamCreate, TeamRead

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=list[TeamRead])
def list_teams(session: Session = Depends(get_session)):
    return session.exec(select(Team).order_by(Team.created_at)).all()


@router.post("", response_model=TeamRead, status_code=201)
def create_team(payload: TeamCreate, session: Session = Depends(get_session)):
    team = Team(name=payload.name)
    session.add(team)
    session.commit()
    session.refresh(team)
    return team
