# AI Agents

A full-stack application with a Next.js frontend and Elysia backend.

## Project Structure

```
.
├── backend/          # Elysia API server (Bun runtime)
├── frontend/         # Next.js application
└── README.md         # This file
```

## Backend

The backend is built with Elysia and runs on Bun.

### Getting Started

```bash
cd backend
bun install
bun run dev
```

The server will start on `http://localhost:3000`

## Frontend

The frontend is built with Next.js.

### Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development

Both backend and frontend can be run simultaneously. Make sure to configure the frontend to point to the correct backend API endpoint.
