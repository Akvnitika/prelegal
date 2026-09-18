"""Wire mirror of the frontend's NdaData (frontend/lib/nda.ts).

Field names, enum literals, and bounds must stay in sync with the
TypeScript interface; the golden-fixture tests on both sides pin this.
"""

import re
from typing import Literal

from pydantic import Field, field_validator

from app.schemas.camel import CamelModel

DEFAULT_PURPOSE = (
    "Evaluating whether to enter into a business relationship with the other party."
)

ISO_DATE_RE = r"^\d{4}-\d{2}-\d{2}$"


class PartyInfo(CamelModel):
    company: str
    name: str
    title: str
    address: str


class NdaData(CamelModel):
    purpose: str
    # yyyy-mm-dd; "" means "not chosen yet" and the frontend renders today.
    effective_date: str
    mnda_term_kind: Literal["expires", "untilTerminated"]
    mnda_term_years: int = Field(ge=1, le=99)
    confidentiality_kind: Literal["years", "perpetuity"]
    confidentiality_years: int = Field(ge=1, le=99)
    governing_law: str
    jurisdiction: str
    modifications: str
    party1: PartyInfo
    party2: PartyInfo

    @field_validator("effective_date")
    @classmethod
    def _iso_or_empty(cls, v: str) -> str:
        if v and not re.fullmatch(ISO_DATE_RE, v):
            raise ValueError("effectiveDate must be yyyy-mm-dd or empty")
        return v
