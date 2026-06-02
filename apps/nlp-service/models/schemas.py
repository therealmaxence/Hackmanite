from pydantic import BaseModel
from pydantic import Field
from typing import Optional
from enum import Enum


class EntityType(str, Enum):
    PERSON = "PERSON"
    ORGANIZATION = "ORGANIZATION"
    LOCATION = "LOCATION"
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    IP_ADDRESS = "IP_ADDRESS"
    URL = "URL"
    DATE = "DATE"
    ADDRESS = "ADDRESS"


class ExtractedEntity(BaseModel):
    canonical: str
    display_name: str
    type: EntityType
    count: int
    excerpts: list[dict]
    metadata: Optional[dict] = None


class EntityNeighborhood(BaseModel):
    source_canonical: str
    source_display_name: str
    source_type: EntityType
    target_canonical: str
    target_display_name: str
    target_type: EntityType
    weight: float
    distance: int
    snippet: str
    source_offset: int
    target_offset: int


class ExtractedEmail(BaseModel):
    message_id: str
    in_reply_to: Optional[str] = None
    references: Optional[str] = None
    subject: str
    from_address: str
    to_address: str
    cc_address: Optional[str] = None
    date: Optional[str] = None
    body: str
    attachments: Optional[list[dict]] = None


class ExtractionResult(BaseModel):
    file_id: str
    entities: list[ExtractedEntity]
    neighborhoods: list[EntityNeighborhood] = Field(default_factory=list)
    emails: list[ExtractedEmail] = Field(default_factory=list)
    processing_time_ms: int
    extractor_used: str
    error: Optional[str] = None


class ExtractionRequest(BaseModel):
    file_id: str
    storage_path: str
    mime_type: str
    window_size: Optional[int] = 400
