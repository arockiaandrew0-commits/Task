# Task tracker

A local task tracker with a plain HTML, CSS, and JavaScript frontend and a Python HTTP API.

## Run locally

With Python 3 installed, open a terminal in this folder and run:

```powershell
py -3 server.py
```

Open [the task tracker](http://127.0.0.1:3000). Add a task, use its checkbox to update its status, or delete it. The server creates `tasks.json` on the first change and reads it on restart.

| Method | Endpoint | JSON request |
| --- | --- | --- |
| GET | /api/tasks | |
| POST | /api/tasks | `{"title":"Read a chapter"}` |
| PATCH | /api/tasks/:id | `{"completed":true}` |
| DELETE | /api/tasks/:id | |
