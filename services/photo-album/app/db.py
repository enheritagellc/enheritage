"""PostgreSQL connection pool (psycopg2 via a simple thread-safe pool)."""
from __future__ import annotations

import psycopg2
import psycopg2.pool
from app.config import settings

_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=settings.database_url,
        )
    return _pool


class Db:
    """Context manager that checks out / returns a connection from the pool."""

    def __enter__(self) -> psycopg2.extensions.connection:
        self._conn = get_pool().getconn()
        return self._conn

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:  # noqa: ANN001
        if exc_type:
            self._conn.rollback()
        else:
            self._conn.commit()
        get_pool().putconn(self._conn)
