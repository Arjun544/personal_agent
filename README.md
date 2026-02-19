# Persona: Your Personal Second Brain

> A proactive, context-aware AI executive assistant designed to manage your time, tasks, and information with precision. Built for seamless continuity and long-term memory.

## 🧠 Agent Capabilities

This system operates as a sophisticated "Second Brain," utilizing a three-layered intelligence model to serve your needs:

### 1. User Identity (Personal Context)
-   **Deep Personalization**: Understands your bio, preferences, and working style.
-   **Memory Management**: Continuously updates its internal records using `upsert_memory` when you correct it or provide new details.
-   **Source**: Injected context and persistent vector memory.

### 2. User Knowledge (Project Intelligence)
-   **Document Analysis**: Capable of ingesting and searching through your proprietary documents (PDFs, project files).
-   **Contextual Retrieval**: Intelligently searches your private knowledge base before consulting external sources.
-   **Source**: Vector store and `search_documents` tool.

### 3. World Knowledge (Real-time Data)
-   **Web Access**: Fetches real-time checks on weather, stocks, and public information when internal knowledge is insufficient.
-   **Source**: `web_search` tool.

### 🗓️ Operational Intelligence
-   **Time Anchoring**: Automatically calculates exact ISO timestamps for relative terms like "next Tuesday".
-   **Proactive Scheduling**: Checks your calendar for conflicts before proposing meeting times.
-   **Executive Tone**: Delivers concise, skimmable, and direct responses without fluff.

## Key Features

### 1. Long-term Memory & Continuity
-   Persists conversations and context across sessions.
-   "Remembering" details from past interactions to inform future responses.

### 2. Real-time Interaction
-   **Instant Messaging**: Low-latency communication powered by Socket.io.
-   **Live Updates**: Real-time feedback on agent thought processes and tool execution.

### 3. Document Intelligence
-   **Upload & Chat**: Drag-and-drop support for PDF and text documents.
-   **Semantic Search**: Finds relevant specific snippets within large documents to answer queries accurately.

### 4. Robust Integration Ecosystem
-   **Google Calendar**: Direct integration for reading and managing schedule events.
-   **Clerk Authentication**: Secure, seamless user identity management.

## Tech Stack

### Frontend
-   **Framework**: Next.js 16 (React 19)
-   **Styling**: Tailwind CSS v4, OKLCH Colors
-   **UI Library**: Shadcn UI, Lucide React Icons
-   **State Management**: TanStack Query (React Query)
-   **Animations**: Framer Motion, tw-animate-css
-   **Real-time**: Socket.io Client
-   **Forms & Validation**: React Hook Form, Zod
-   **Markdown Rendering**: React Markdown, Remark GFM

### Backend
-   **Runtime**: Bun (Performance-focused JavaScript runtime)
-   **Framework**: Express.js
-   **AI Orchestration**: LangChain, LangGraph, LangSmith
-   **Database**: PostgreSQL
-   **ORM**: Drizzle ORM
-   **Authentication**: Clerk SDK
-   **Real-time**: Socket.io Server
-   **Storage**: Supabase / Local
-   **Integrations**: Google APIs (Calendar), Redis (Caching)
-   **Logging**: Pino

## Project Structure

```
.
├── backend/          # Express API server running on Bun
│   ├── src/
│   │   ├── config/   # Environment & Service configs
│   │   ├── routes/   # API Endpoint definitions
│   │   ├── services/ # Business logic (Memory, Chat, Tools)
│   │   └── prompts/  # System prompts & Agent personas
├── frontend/         # Next.js 16 Client Application
│   ├── app/          # App Router pages & layouts
│   ├── components/   # Reusable UI components
│   ├── lib/          # Utilities & Helper functions
│   └── hooks/        # Custom React hooks
└── README.md         # Documentation
```

## Getting Started

### Backend Setup

The backend uses **Express** running on the **Bun** runtime for high performance.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Start the development server:
    ```bash
    bun run dev
    ```
    *Server flows on `http://localhost:5000` (Socket.IO & API)*

### Frontend Setup

The frontend is a **Next.js 16** application.

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    *Application launches at `http://localhost:3000`*

---

**Note**: Both servers must be running simultaneously for the full application to function.
