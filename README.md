# MedCare Connect Server

Backend API for **MedCare Connect**, an AI-powered healthcare platform for authentication, symptom chat, report analysis, reminders, pharmacy workflows, health records, and emergency support.

## Tech Stack

- Node.js
- Express
- MongoDB Atlas + Mongoose
- JWT authentication
- Firebase/Google sign-in bridge
- Multer file uploads
- Tesseract.js and pdf-parse for report analysis
- Gemini/OpenAI-compatible AI service layer

## Features

- Email/password registration and login
- Google sign-in API support
- Access and refresh token handling
- Protected user profile APIs
- AI symptom chat and chat history
- Medical report upload and OCR parsing
- Health timeline, risk score, and memory APIs
- Reminder CRUD with due/complete support
- Pharmacy search and medicine order request APIs
- Global error handling, CORS, Helmet, and rate limiting

## Setup

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Update `.env` with your real credentials:

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
```

Optional AI provider keys:

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_KEY=your_openai_key
```

## Run

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Tests:

```bash
npm test
```

## API Groups

```text
/api/auth
/api/user
/api/chat
/api/reports
/api/health
/api/doctor
/api/reminders
/api/pharmacy
```

## Security

Do not commit `.env`. This repository includes `.gitignore` rules to keep secrets, uploads, logs, and dependencies out of git.

## Deployment

Recommended backend hosting:

- Render
- Railway
- Fly.io

Use:

```text
Build command: npm install
Start command: npm start
```

Set all required environment variables in the hosting dashboard.
