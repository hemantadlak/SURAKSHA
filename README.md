# SURAKSHA

Disaster relocation planning prototype for an illustrative Brahmaputra basin flood scenario. SURAKSHA combines transparent hazard scoring, habitation vulnerability, shelter eligibility, capacity allocation, and route visualization in one interface.

## What it demonstrates

- A command center with district maps, indicators, and hazard intelligence.
- Explainable risk and relocation priority scores with configurable hazard profiles.
- Shelter eligibility checks and capacity-aware relocation plans.
- Route candidates using OSRM, with an explicitly labelled illustrative fallback when routing is unavailable.
- Field reports, alert acknowledgements, and saved action plans backed by MongoDB.
- A citizen information view.

The data and scoring model are illustrative prototype inputs. Satellite imagery is a contextual basemap; the app does not infer hazards from satellite images. Plans require review by the competent disaster-management authority before any operational use.

## Stack and layout

| Directory | Purpose |
| --- | --- |
| `frontend/` | React 19, React Router, Leaflet, Tailwind CSS, and CRACO |
| `backend/` | FastAPI API, scoring engine, routing, and core checks |
| `backend/data/` | Illustrative districts, habitations, hazards, infrastructure, and shelters |

## Run locally

You need Node.js with Yarn Classic (the frontend declares Yarn 1.22.22), Python with virtual environment support, and a running MongoDB instance. Install the dependencies below before starting either service.

### Backend

From the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

Edit `backend/.env` to match your MongoDB connection. The dependency list includes `emergentintegrations`; if your package index cannot resolve it, obtain access to its distribution before proceeding.

API status: <http://localhost:8000/api/>. Interactive API documentation: <http://localhost:8000/docs>.

### Frontend

In a second terminal, from the repository root:

```sh
cd frontend
cp .env.example .env
# Set REACT_APP_BACKEND_URL to the backend origin, without /api.
yarn install
yarn start
```

Open <http://localhost:3000>. Restart the frontend after changing its environment file. Never put database credentials or other secrets in `REACT_APP_` variables, which are bundled into browser code.

## Validation

Build the frontend:

```sh
cd frontend
yarn build
```

Run the existing core scenario checks with the backend dependencies installed:

```sh
cd backend
python test_core.py
```

These checks cover district geometry, risk scores, shelter suitability, allocation reconciliation, and routing. Routing checks may contact the public OSRM service. They do not constitute production or end-to-end certification.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `MONGO_URL` | Backend | MongoDB connection string |
| `DB_NAME` | Backend | Database for persisted prototype records |
| `CORS_ORIGINS` | Backend | Comma-separated allowed frontend origins |
| `OSRM_URL` | Backend | Optional routing service origin |
| `REACT_APP_BACKEND_URL` | Frontend | Backend origin; the client appends `/api` |

Environment templates contain local development defaults only. Keep your actual `.env` files out of Git. The API exposes write endpoints without an authentication layer; use a local development environment until access controls are implemented.

## Related project

[PULSEGRID](https://github.com/hemantadlak/pulsegrid) explores simulated emergency dispatch and hospital capability matching.
