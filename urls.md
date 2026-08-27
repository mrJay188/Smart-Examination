# Smart Exam - Project URLs

This document contains all the frontend routes and backend API endpoints you need to navigate and test the application.

## Frontend Application (React)
Assuming your Vite server is running on the default port: **http://localhost:5173**

### Public / Authentication
- **Login Page**: [http://localhost:5173/login](http://localhost:5173/login)

### Student Portal (Requires Student Login)
- **Student Dashboard**: `http://localhost:5173/student/dashboard` (View available exams)
- **Exam Room**: `http://localhost:5173/student/exam/:examId` (The actual test-taking interface with AI proctoring)

### Admin Portal (Requires Admin Login)
- **Admin Dashboard**: `http://localhost:5173/admin/dashboard` (Create and view exams)
- **Exam Details & Questions**: `http://localhost:5173/admin/exam/:examId` (Add questions and view student results/flags)

---

## Backend API (Node.js/Express)
Assuming your Express server is running on the default port: **http://localhost:5000**

> **Note**: All endpoints except Login and Register require an `Authorization: Bearer <token>` header.

### Auth Endpoints
- `POST /api/auth/register` - Register a new user. Body: `{ "name": "...", "email": "...", "password": "...", "role": "ADMIN" | "STUDENT" }`
- `POST /api/auth/login` - Login and get JWT token. Body: `{ "email": "...", "password": "..." }`

### Exam Endpoints
- `GET /api/exams` - Fetch all exams.
- `GET /api/exams/:examId` - Fetch details and questions for a specific exam.
- `POST /api/exams` - *(Admin Only)* Create a new exam. Body: `{ "title": "...", "duration": 60, ... }`
- `POST /api/exams/:examId/questions` - *(Admin Only)* Add a question. Body: `{ "text": "...", "type": "MCQ", "options": ["A","B"], "correctAnswer": "A" }`

### Student Action Endpoints
- `POST /api/exams/:examId/submit` - Submit the exam. Body: `{ "score": 90, "answers": {...} }`
- `POST /api/exams/:examId/proctor` - Log an AI proctoring flag. Body: `{ "eventType": "TAB_SWITCH", "severity": "HIGH" }`
