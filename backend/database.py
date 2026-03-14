import sqlalchemy
from databases import Database
import os

DATABASE_URL = "sqlite:///./rooms.db"

database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

rooms = sqlalchemy.Table(
    "rooms",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("name", sqlalchemy.String),
    sqlalchemy.Column("host_id", sqlalchemy.String),
    sqlalchemy.Column("created_at", sqlalchemy.DateTime, server_default=sqlalchemy.func.now()),
    sqlalchemy.Column("is_active", sqlalchemy.Boolean, default=True),
)

messages = sqlalchemy.Table(
    "messages",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("room_id", sqlalchemy.String, sqlalchemy.ForeignKey("rooms.id")),
    sqlalchemy.Column("user_id", sqlalchemy.String),
    sqlalchemy.Column("username", sqlalchemy.String),
    sqlalchemy.Column("content", sqlalchemy.String),
    sqlalchemy.Column("timestamp", sqlalchemy.DateTime, server_default=sqlalchemy.func.now()),
)

engine = sqlalchemy.create_engine(
    DATABASE_URL.replace("sqlite:///", "sqlite:///"),
    connect_args={"check_same_thread": False}
)
metadata.create_all(engine)
