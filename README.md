# Stratum – Intelligent Learning & Task Management Platform

Final Year BSc Computer Science Project – 2025  
Aleksejs Moscanovs, City, University of London

---

## Running the Project

To run the application locally:

1. Make sure you have **Node.js** and **npm** installed.
2. Place the provided `.env` file in the project root directory.
3. Run the following commands in your terminal:
   ```bash
   npm install
   npm run dev
4. Open your browser and go to: http://localhost:3000





Folder Structure

root/
├── public/                  # Public assets
├── src/
│   ├── components/          # Reusable UI components (forms, cards, editors)
│   ├── pages/               # Route-level views (login, dashboard, etc.)
│   ├── layouts/             # Shared layout wrappers
│   ├── instructor/          # Instructor-specific views
│   ├── student/             # Student-specific views
│   ├── auth/                # Authentication and access logic
│   ├── services/            # Firebase services and utilities
│   └── server.mjs           # Local AI backend (Node.js)
├── .env                     # Environment variables (submitted separately)
├── firebase.json            # Firebase hosting configuration
├── functions/               # Cloud Functions (AI generation endpoint)
└── README.md                # This file


Overview
Stratum is a full-stack web platform for intelligent course delivery and student management. It enables instructors to:

Create and edit structured courses

Track student progress in real time

Assign tasks and manage deadlines

Respond to help requests directly from lesson views

Use AI (Anthropic Claude) to automatically generate course content

The system supports role-based access, with dedicated dashboards and features for instructors and students.