# Smart Exam – AI-Proctored Online Examination Portal

## 1. Project Overview

Smart Exam is an intelligent web-based online examination platform designed to simplify the process of conducting, managing, monitoring, and evaluating examinations. The system provides separate portals for students and administrators and integrates AI-based proctoring features to improve examination integrity.

The platform allows administrators to create and manage examinations, questions, students, results, and examination settings. Students can securely log in, attempt assigned examinations, and submit their answers through an interactive online examination interface.

A key feature of Smart Exam is its AI-assisted proctoring functionality. During an examination, the system can request access to the student's camera and monitor the examination session for potential suspicious activities such as the absence of a face, the presence of multiple faces, or other unusual visual conditions. Detected events can be recorded as proctoring flags for later review by an administrator.

The project aims to provide a smarter, more scalable, and more transparent alternative to traditional online examination systems.

---

## 2. Problem Statement

Traditional examination systems require significant manual effort for examination management, student monitoring, answer evaluation, and result generation. Online examinations solve some of these problems but introduce new challenges related to academic integrity and examination security.

Without proper monitoring, students may attempt to use unauthorized assistance, allow another person to take the examination, or engage in suspicious activities during an online exam.

Smart Exam addresses these challenges by combining an online examination management system with AI-assisted proctoring capabilities. The platform enables administrators to manage the complete examination process while providing mechanisms to monitor suspicious events during student examinations.

---

## 3. Objectives

The main objectives of the Smart Exam system are:

- To provide a centralized online examination platform.
- To provide separate student and administrator portals.
- To allow administrators to create and manage examinations.
- To allow administrators to create, edit, and organize examination questions.
- To allow students to securely attend online examinations.
- To automatically calculate examination scores where applicable.
- To provide AI-assisted proctoring features during examinations.
- To enable camera access for examination monitoring.
- To detect and record potential suspicious activities.
- To improve transparency and examination integrity.
- To provide administrators with examination reports and results.

---

## 4. Proposed Solution

Smart Exam is a full-stack web application built using React for the frontend, Node.js for the backend, and SQL for database management.

The system consists of two primary user roles:

### Student

Students can:

- Register and log in to the platform.
- View available or assigned examinations.
- View examination instructions.
- Grant camera access when required.
- Attempt online examinations.
- Answer multiple-choice and other supported question types.
- Monitor remaining examination time.
- Submit examinations.
- View examination results when released by the administrator.

### Administrator

Administrators can:

- Securely access the administration panel.
- Manage student accounts.
- Create and manage examinations.
- Create, edit, and delete questions.
- Configure examination duration and settings.
- Monitor examination participation.
- Review submitted examinations.
- View AI proctoring flags.
- Review suspicious activity records.
- Publish and manage examination results.
- Generate reports and analyze examination performance.

---

## 5. Key Features

### 5.1 Secure Authentication

The system provides authentication and authorization for students and administrators. Different users receive access according to their assigned roles.

### 5.2 Student Examination Portal

The student portal provides an interface where students can:

- Access assigned examinations.
- Read examination instructions.
- Attempt examinations.
- Navigate between questions.
- Save and submit answers.
- Track examination progress.
- View the remaining examination time.

### 5.3 Administrator Panel

The administrator panel provides centralized control over the examination system.

Administrators can manage:

- Students
- Examinations
- Questions
- Examination schedules
- Results
- Proctoring records
- Suspicious activity reports

### 5.4 Question Management

Administrators can create and manage questions for examinations.

The system can support:

- Multiple Choice Questions (MCQs)
- True/False Questions
- Short-answer questions
- Other question formats based on system implementation

Questions can be grouped and assigned to specific examinations.

### 5.5 Examination Timer

Each examination can have a configured duration.

The system displays the remaining time to the student during the examination. When the examination time expires, the system can automatically submit the examination according to the configured rules.

### 5.6 Automatic Result Evaluation

For objective questions such as MCQs, the system can automatically compare student answers with the correct answers and calculate the score.

Administrators can review results and make them available to students.

### 5.7 Camera-Based AI Proctoring

Smart Exam includes an AI-assisted proctoring module.

Before or during an examination, the system can request access to the student's camera. The camera stream can be used to analyze the examination environment and detect potential suspicious events.

Possible proctoring events include:

- No face detected.
- Multiple faces detected.
- Student leaving the camera view.
- Camera being blocked or covered.
- Unusual movement or suspicious visual conditions.

Detected events can be stored as proctoring flags and made available to administrators for review.

AI-based detection is intended to assist administrators and should be used as a review mechanism rather than automatically determining whether a student has cheated.

### 5.8 Suspicious Activity Logging

When the system detects a potential violation, it can create an event record containing information such as:

- Student ID
- Examination ID
- Event type
- Detection timestamp
- Severity level
- Additional detection information

Administrators can review these records after the examination.

### 5.9 Examination Results and Reports

The system provides examination results and administrative reporting features.

Possible reports include:

- Student examination performance.
- Examination-wise results.
- Student participation.
- Score distribution.
- Proctoring event summaries.
- Suspicious activity reports.

---

## 6. Technology Stack

### Frontend

The frontend is developed using:

- React.js
- JavaScript
- HTML5
- CSS3
- React Router
- Axios or Fetch API

### Backend

The backend is developed using:

- Node.js
- Express.js
- REST API architecture

### Database

The application uses a SQL-based relational database.

Possible supported databases include:

- MySQL
- PostgreSQL

The database stores user information, examinations, questions, answers, results, and proctoring events.

### AI and Proctoring

The AI proctoring component may use:

- Browser camera APIs
- MediaDevices API
- Computer vision or face detection models
- Machine learning-based detection techniques

---

## 7. System Architecture

The Smart Exam system follows a client-server architecture.

```text
+-----------------------+
|     Student Portal    |
|       React.js        |
+-----------+-----------+
            |
            | HTTP / HTTPS
            |
+-----------v-----------+
|                       |
|   Node.js Backend     |
|      Express API      |
|                       |
+-----------+-----------+
            |
            | SQL Queries
            |
+-----------v-----------+
|                       |
|      SQL Database     |
|                       |
| Users                 |
| Exams                 |
| Questions             |
| Answers               |
| Results               |
| Proctoring Events     |
|                       |
+-----------------------+