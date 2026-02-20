from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    email: str
    name: str | None
    avatar_url: str | None
    provider: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user):
        return cls(
            id=str(user.id),
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            provider=user.provider,
        )
