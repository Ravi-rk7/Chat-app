# Yappy Chat App

A polished real-time chat application built with React, Vite, Tailwind CSS, DaisyUI, Zustand, Node.js, Express, MongoDB, and Socket.IO.

## Highlights

- JWT authentication with protected routes
- Real-time direct messaging with Socket.IO
- Online presence and last seen states
- Typing indicators, unread counts, and last-message previews
- Message delivery and seen states
- Image sharing with Cloudinary uploads
- Theme customization with DaisyUI themes
- Responsive sidebar/chat experience for desktop and mobile
- Profile management with avatar uploads

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, DaisyUI, Zustand, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, JWT, bcryptjs, Cloudinary

## Environment Setup

Create the environment files from the provided examples:

- `frontend/.env.example`
- `backend/.env.example`

## Run Locally

### 1. Install dependencies

```bash
cd frontend
npm install
cd ../backend
npm install
```

### 2. Configure environment variables

Update the frontend and backend `.env` files with your own values.

### 3. Start the backend

```bash
cd backend
npm run dev
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

## Resume-Focused Features

- Production-style conversation sidebar with search, unread badges, and previews
- Realtime UX upgrades including typing, delivery, and seen states
- Clean responsive layout that adapts from inbox view to focused mobile chat view
- Better environment configuration and safer auth/profile response handling

## Notes

- The frontend expects the backend API base URL and socket URL from environment variables, with localhost fallbacks for local development.
- Cloudinary is used for avatar and chat image uploads.
