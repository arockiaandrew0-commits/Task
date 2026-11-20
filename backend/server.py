import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
STORE = Path(os.environ.get("TASKS_FILE", ROOT / "tasks.json"))
ASSETS = {
    "/": ("index.html", "text/html"),
    "/style.css": ("style.css", "text/css"),
    "/app.js": ("app.js", "text/javascript"),
}
TASK_ROUTE = re.compile(r"/api/tasks/([a-f0-9-]+)")


class RequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


class TaskServer(HTTPServer):
    def __init__(self, address):
        try:
            self.tasks = json.loads(STORE.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.tasks = []
        super().__init__(address, TaskHandler)

    def save(self, tasks):
        pending = STORE.with_name(STORE.name + ".tmp")
        pending.write_text(json.dumps(tasks, indent=2), encoding="utf-8")
        pending.replace(STORE)
        self.tasks = tasks


class TaskHandler(BaseHTTPRequestHandler):
    def respond(self, status, content=b"", content_type=None):
        self.send_response(status)
        self.send_header("Content-Length", str(len(content)))
        if content_type:
            self.send_header("Content-Type", content_type)
        if content_type == "application/json":
            self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def respond_json(self, status, value):
        self.respond(status, json.dumps(value).encode("utf-8"), "application/json")

    def read_body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 0:
                raise ValueError()
            if length > 4096:
                raise RequestError(413, "Request is too large.")
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(body, dict):
                raise ValueError()
            return body
        except ValueError:
            raise RequestError(400, "Expected a JSON object.") from None

    def dispatch(self):
        route = urlsplit(self.path).path
        method = self.command
        tasks = self.server.tasks

        if method == "GET" and route in ASSETS:
            filename, mime = ASSETS[route]
            return self.respond(200, (ROOT / "frontend" / filename).read_bytes(), mime + "; charset=utf-8")

        if route == "/api/tasks":
            if method == "GET":
                return self.respond_json(200, tasks)
            if method == "POST":
                title = self.read_body().get("title")
                title = title.strip() if isinstance(title, str) else ""
                if not title or len(title.encode("utf-16-le", errors="surrogatepass")) > 240:
                    raise RequestError(400, "Enter a task between 1 and 120 characters.")
                task = {"id": str(uuid4()), "title": title, "completed": False}
                self.server.save([task, *tasks])
                return self.respond_json(201, task)

        match = TASK_ROUTE.fullmatch(route)
        if match and method in ("PATCH", "DELETE"):
            body = self.read_body() if method == "PATCH" else None
            task_id = match[1]
            for index, task in enumerate(tasks):
                if task["id"] == task_id:
                    break
            else:
                raise RequestError(404, "Task not found.")

            next_tasks = tasks.copy()
            if method == "DELETE":
                del next_tasks[index]
                self.server.save(next_tasks)
                return self.respond(204)

            completed = body.get("completed")
            if not isinstance(completed, bool):
                raise RequestError(400, "Completed must be true or false.")
            updated = {**task, "completed": completed}
            next_tasks[index] = updated
            self.server.save(next_tasks)
            return self.respond_json(200, updated)

        raise RequestError(404, "Page not found.")

    def handle_request(self):
        try:
            self.dispatch()
        except RequestError as error:
            self.respond_json(error.status, {"error": str(error)})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except OSError as error:
            self.log_error("%s", error)
            self.respond_json(500, {"error": "The server could not complete the request."})

    do_GET = do_POST = do_PATCH = do_DELETE = handle_request


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "3000"))
    with TaskServer(("127.0.0.1", port)) as server:
        print(f"Task tracker is running at http://127.0.0.1:{server.server_port}", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
