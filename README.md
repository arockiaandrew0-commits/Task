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

## Deploy to Vercel and Cloudflare Pages

1. Push the updated project to the Git repository connected to both services.
2. In Vercel, import the repository, select the `backend` root directory and **FastAPI** framework preset, and leave the build, output, and install overrides off.
3. Connect a Postgres database such as Neon. Run [backend/schema.sql](backend/schema.sql) once in its SQL editor. Set `DATABASE_URL` in the Vercel project's Production environment to the database's pooled connection string, or use the variable supplied by the integration. Deploy or redeploy after it is set.
4. Open `https://YOUR-BACKEND.vercel.app/api/tasks`. A newly initialized database should return `[]`.
5. In the Cloudflare Pages production build settings, set `VITE_API_URL` to `https://YOUR-BACKEND.vercel.app` and redeploy the frontend. The API allows browser requests from `https://task-854.pages.dev`.

The hosted database starts empty. Local development still uses the original JSON store. The hosted API has a single shared task list and no sign-in.
