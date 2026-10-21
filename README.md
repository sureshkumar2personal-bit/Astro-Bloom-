# CosmicConnect — authentication module

React/Vite and Express implementation of the supplied user and astrologer authentication flow.

## Run it

1. Install dependencies: `npm install`
2. Start both apps: `npm run dev`
3. Open the Vite URL shown in the terminal (usually `http://localhost:5173`). The API runs on port `5000`.

## Routes

- `/user/register`, `/user/login`, `/user/dashboard`
- `/astrologer/register`, `/astrologer/login`, `/astrologer/dashboard`

The backend uses an in-memory development store so it is immediately runnable without PostgreSQL. It implements password hashing, JWT access/refresh tokens, duplicate checks, protected `/me` endpoints, logout, multipart document intake (PDF/images, 5 MB each), and the astrologer approval gate. Data resets when the API restarts; replace the arrays in `backend/src/server.js` with the documented PostgreSQL tables before production use.

Astrologer accounts are active immediately after registration; they can sign in and manage their profile and availability without an administrator approval step.
