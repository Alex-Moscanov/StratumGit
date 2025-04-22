# Stratum – Intelligent Learning & Task Management Platform

🟢 [Live Demo →](https://stratum-bfc26.web.app)

Stratum is a full-stack educational platform designed for online course creators to **manage student progress**, **assign tasks**, **respond to help requests**, and **automate course creation** using AI.

> Final Year BSc Computer Science Project – 2025  
> Built by Aleksejs Moscanovs, City, University of London


##  Getting Started (Run Locally)

This project relies on a .env file that contains sensitive API keys and Firebase configuration. For security reasons, this file is not included in the repository.

The .env file has been shared separately with the supervisor as part of the project submission.
To run the application locally or build it for deployment, place the .env file in the root of the project directory.

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Alex-Moscanov/StratumGit.git
   cd StratumGit
   npm install
   cp .env.example .env
   npm run dev
```
> Visit [http://localhost:3000](http://localhost:3000) in your browser to get started.


2. Register as a student,using your credentials and a student access code "2025"

3. Register as an instructor, using the instructor access code ""INSTRUCTOR2025"

4. Create a course, within the courses page go to 'View' -> 'Manage Students' -> input student email address and click "+ Enroll Student" to generate a course access code for them. 

5. Within 'View Course' page, press 'Course Tasks' to create a new assignment for a student. 

6. To access the course as a student, input the access code generated. 

---

##  Features

### Authentication & Role-Based Access
- Users are prompted on the landing page to select their role (Instructor / Student).
- Each role has separate registration forms requiring a **hardcoded access code**.
- Users can only access their respective portals (with error handling if attempting otherwise).

### Instructor Dashboard
- Overview of enrolled students, upcoming deadlines, and task completion rate.
- Assign course-specific tasks with title, description, deadline, and recipient selection.
- View a dynamic task completion tracker (per day, % completion).
- View and respond to Help Requests in real time.
- Access detailed student profiles, performance, and assignment submissions.

### Student Dashboard
- Display enrolled courses and lesson progress.
- Visual progress tracker with weekly learning plan and overdue task alerts.
- Quick access to upcoming assignments and notifications.
- "Need Help?" form under each lesson to request support from instructors.

###  Course Management
- AI-assisted course generation using Anthropic Claude API.
- Support for adding modules, lessons, and dynamic content blocks.
- Instructors can enroll students using email-based invites and auto-generated access codes.

###  Help Requests System
- Students can submit contextual help requests from any lesson.
- Instructors view, sort, and reply to requests via a centralised inbox.

---

##  AI Integration

### AI-Powered Course Creation (Anthropic Claude)
- Instructors input course topics via a rich text prompt.
- Backend Node.js server processes the request and returns a structured curriculum.
- Firebase Firestore stores course modules and lesson content.

---


##  File Structure

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

---
