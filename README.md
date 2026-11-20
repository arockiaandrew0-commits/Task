# Task tracker

The React and Vite frontend lives in `frontend/`. The Python HTTP API lives in `backend/`, and task data is saved in `tasks.json` at the project root.

## Run in development

Use Python 3 and Node.js 20.19+ or 22.12+. From the project root, start the API in one PowerShell terminal:

```powershell
py -3 backend/server.py
```

In a second terminal, start Vite:

```powershell
cd frontend
npm ci
npm run dev
```

Open [the Vite development server](http://127.0.0.1:5173). Vite forwards API requests to port 3000. If you change the Python server port using the `PORT` environment variable, set `API_TARGET` in the Vite terminal to the corresponding URL.

## Run the built app

From `frontend/`, run `npm run build` after installing dependencies. From the project root, run `py -3 backend/server.py` and open [the built app](http://127.0.0.1:3000).

| Method | Endpoint | JSON request |
| --- | --- | --- |
| GET | /api/tasks | |
| POST | /api/tasks | `{"title":"Read a chapter"}` |
| PATCH | /api/tasks/:id | `{"completed":true}` |
| DELETE | /api/tasks/:id | |
