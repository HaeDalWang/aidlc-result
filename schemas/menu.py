from typing import Optional
from pydantic import BaseModel


class MenuResponse(BaseModel):
    id: int
    name: str
    price: int
    description: Optional[str]
    image_url: Optional[str]
    sort_order: int

    model_config = {"from_attributes": True}


class CategoryWithMenus(BaseModel):
    id: int
    name: str
    sort_order: int
    menus: list[MenuResponse]

    model_config = {"from_attributes": True}
