"""FastAPI app untuk Gardu backend."""

from fastapi import FastAPI, HTTPException

from backend.agents.risk_prediction import calculate_risk_score
from backend.db.queries import DBQueryError, upsert_risk_score

app = FastAPI(title="Gardu Backend")


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
