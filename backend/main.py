"""FastAPI app untuk Gardu backend."""

from datetime import datetime
from uuid import UUID

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, field_validator

from backend.agents.risk_prediction import calculate_risk_score
from backend.db.queries import (
    DBQueryError,
    get_report_by_id,
    insert_report,
    upsert_risk_score,
)

app = FastAPI(title="Gardu Backend")


class ReportCreate(BaseModel):
    description: str
    location: str
    reported_at: datetime

    @field_validator("description", "location")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("tidak boleh kosong")
        return value


class ReportCreateResponse(BaseModel):
    id: UUID
    status: str


@app.get("/agents/risk")
def get_risk(area: str, time_slot: str):
    """Sesuai docs/contracts.md — Risk Prediction Agent.

    Response: { "area": string, "time_slot": string, "score": number }
    """
    try:
        result = calculate_risk_score(area, time_slot)
        upsert_risk_score(result["area"], result["time_slot"], result["score"])
    except DBQueryError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return result


@app.post("/reports", response_model=ReportCreateResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate):
    """Terima laporan warga. Status awal selalu "menunggu_verifikasi"
    (embedding diisi belakangan oleh Verification Agent, bukan di sini)."""
    try:
        row = insert_report(
            {
                "description": payload.description,
                "location": payload.location,
                "reported_at": payload.reported_at.isoformat(),
                "status": "menunggu_verifikasi",
            }
        )
    except DBQueryError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"id": row["id"], "status": row["status"]}


@app.get("/reports/{report_id}")
def get_report(report_id: UUID):
    """Ambil satu laporan berdasarkan id — untuk testing/verifikasi manual."""
    try:
        row = get_report_by_id(str(report_id))
    except DBQueryError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if row is None:
        raise HTTPException(status_code=404, detail="Report tidak ditemukan")

    return row
