from pydantic import BaseModel
from typing import Optional

# The Master Character Object
class Character(BaseModel):
    id: Optional[int] = None
    name: str
    description: str  # The physical text description for Flux
    face_path: str    # Path to the cropped face image for ReActor
    
    # Helper: Combines the character's base look with a scene description
    def get_full_prompt(self, scene_description: str) -> str:
        return f"{self.description}, {scene_description}"

# Request model for creating a character via API
class CharacterRequest(BaseModel):
    name: str
    description: str