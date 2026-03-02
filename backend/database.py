"""
Configuration de la base de données PostgreSQL (SQLAlchemy + asyncpg)
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Variables de connexion SQLite Asynchrone
DATABASE_URL = "sqlite+aiosqlite:///./haven.db"

# Create the async engine
engine = create_async_engine(DATABASE_URL, echo=True, connect_args={"check_same_thread": False})

# Create the async session factory
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for the declarative models
Base = declarative_base()

async def get_db():
    """ Dependency used in FastAPI to get the database session """
    async with async_session() as session:
        yield session
