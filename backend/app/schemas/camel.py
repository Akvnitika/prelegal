from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Base for wire-facing schemas: snake_case attributes in Python,
    camelCase keys on the wire (matching the frontend's TypeScript types).
    `populate_by_name` lets tests and internal code use either spelling."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
