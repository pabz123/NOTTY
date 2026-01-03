from pydantic import BaseModel
from datetime import datetime

class ActivityCreate(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime

class ActivityResponse(BaseModel):
    id: int
    title: str
    description: str | None
    deadline: datetime
    status: str

    model_config = {
        "from_attributes": True
    }
