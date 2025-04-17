# Stratum – Intelligent Learning & Task Management Platform

Stratum is a full-stack educational platform designed for online course creators to **manage student progress**, **assign tasks**, **respond to help requests**, and **automate course creation** using AI.

> Final Year BSc Computer Science Project – 2025  
> Built by Aleksejs Moscanovs, City, University of London

---

## 🔧 Features

### 🔑 Authentication & Role-Based Access
- Users are prompted on the landing page to select their role (Instructor / Student).
- Each role has separate registration forms requiring a **hardcoded access code**.
- Users can only access their respective portals (with error handling if attempting otherwise).

### 🧑‍🏫 Instructor Dashboard
- Overview of enrolled students, upcoming deadlines, and task completion rate.
- Assign course-specific tasks with title, description, deadline, and recipient selection.
- View a dynamic task completion tracker (per day, % completion).
- View and respond to Help Requests in real time.
- Access detailed student profiles, performance, and assignment submissions.

### 🎓 Student Dashboard
- Display enrolled courses and lesson progress.
- Visual progress tracker with weekly learning plan and overdue task alerts.
- Quick access to upcoming assignments and notifications.
- "Need Help?" form under each lesson to request support from instructors.

### 📚 Course Management
- AI-assisted course generation using Anthropic Claude API.
- Support for adding modules, lessons, and dynamic content blocks.
- Instructors can enroll students using email-based invites and auto-generated access codes.

### 🆘 Help Requests System
- Students can submit contextual help requests from any lesson.
- Instructors view, sort, and reply to requests via a centralised inbox.

---

## 🧠 AI Integration

### AI-Powered Course Creation (Anthropic Claude)
- Instructors input course topics via a rich text prompt.
- Backend Node.js server processes the request and returns a structured curriculum.
- Firebase Firestore stores course modules and lesson content.

---

## 🔥 Tech Stack

| Technology       | Description                                  |
|------------------|----------------------------------------------|
| **React**        | Frontend Framework (Vite + TailwindCSS)      |
| **Node.js**      | Backend for AI integration                   |
| **Firebase**     | Auth, Firestore DB, and Storage              |
| **Anthropic API**| AI-powered course generation                 |
| **Figma**        | UI Prototyping                               |
| **Canva**        | Logo design                                  |

---

## 🗂️ File Structure

```bash
src/
  ├── components/
  ├── pages/
  ├── layouts/
  ├── instructor/
  ├── student/
  ├── auth/
  ├── services/
  ├── server.mjs         # AI backend integration
.env                    # Environment variables
firebase.json
