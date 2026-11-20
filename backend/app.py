import os
from contextlib import contextmanager
from uuid import uuid4

import psycopg
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg.rows import dict_row
from pydantic import BaseModel, StrictBool

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://task-854.pages.dev"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


class NewTask(BaseModel):
    title: str


class TaskUpdate(BaseModel):
    completed: StrictBool


@contextmanager
def database():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise HTTPException(503, detail="Task storage is not configured.")
    try:
        with psycopg.connect(url, row_factory=dict_row, connect_timeout=5) as connection:
            yield connection
    except (psycopg.OperationalError, psycopg.errors.UndefinedTable) as error:
        raise HTTPException(503, detail="Task storage is unavailable.") from error


@app.exception_handler(HTTPException)
async def api_error(_request, error):
    return JSONResponse({"error": error.detail}, status_code=error.status_code)


@app.get("/api/tasks")
def list_tasks(response: Response):
    response.headers["Cache-Control"] = "no-store"
    with database() as connection:
        return connection.execute(
            "SELECT id, title, completed FROM tasks ORDER BY sequence DESC"
        ).fetchall()


@app.post("/api/tasks", status_code=201)
def add_task(body: NewTask):
    title = body.title.strip()
    if not title or len(title.encode("utf-16-le", errors="surrogatepass")) > 240 or any(char == "\x00" or "\ud800" <= char <= "\udfff" for char in title):
        raise HTTPException(400, detail="Enter a valid task between 1 and 120 characters.")
    with database() as connection:
        return connection.execute(
            "INSERT INTO tasks (id, title) VALUES (%s, %s) RETURNING id, title, completed",
            (str(uuid4()), title),
        ).fetchone()


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: str, body: TaskUpdate):
    with database() as connection:
        task = connection.execute(
            "UPDATE tasks SET completed = %s WHERE id = %s RETURNING id, title, completed",
            (body.completed, task_id),
        ).fetchone()
        if task is None:
            raise HTTPException(404, detail="Task not found.")
        return task


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: str):
    with database() as connection:
        if not connection.execute("DELETE FROM tasks WHERE id = %s", (task_id,)).rowcount:
            raise HTTPException(404, detail="Task not found.")
    return Response(status_code=204)
