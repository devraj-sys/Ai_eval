# 🎓 AI Evaluation System

An AI-powered exam evaluation platform where teachers create question papers, students submit answer sheets, and Google Gemini automatically grades them — all organized through a class-based system.

---

## 🚀 Live Demo

- **Frontend:** Deployed on Vercel / Netlify
- **Backend:** [https://ai-eval-74ay.onrender.com](https://ai-eval-74ay.onrender.com)

---

## 📌 What It Does

| Role | Capabilities |
|------|-------------|
| **Teacher** | Create classes with join codes, upload question papers (PDF), AI generates answer keys, review/edit answer keys, approve papers, view student results, export CSV |
| **Student** | Join classes using a code, submit answer sheet PDFs, get AI-graded results instantly with per-question feedback and scores |

---

## 🧠 How the AI Works

1. **Answer Key Generation** — Teacher uploads a question paper PDF. Gemini reads it and extracts each question with an expected answer and max marks as a JSON array.
2. **Answer Evaluation** — Student uploads their answer sheet PDF. Gemini compares it against the stored answer key and returns awarded marks + feedback per question.

Both use **Google Gemini 2.5 Flash** via the `@google/generative-ai` SDK with PDF inline data.

---

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Axios** for API calls
- **DM Sans** (Google Fonts) for typography
- Custom CSS (no UI library) — dark/light theme via CSS variables

### Backend
- **Node.js + Express**
- **MongoDB + Mongoose**
- **JWT** for authentication
- **Multer** for PDF file uploads
- **Google Generative AI SDK** (Gemini 2.5 Flash)
- **bcryptjs** for password hashing
- **crypto** for generating unique class codes

---

## 📁 Project Structure

```
ai-eval-app/
├── backend/
│   ├── models/
│   │   ├── User.js          # name, email, password, role (teacher/student)
│   │   ├── Class.js         # name, teacherId, code, students[]
│   │   ├── Paper.js         # title, teacherId, classId, answerKey[], isApproved
│   │   └── Submission.js    # studentId, paperId, gradingResult[], totalMarks, percentage
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   ├── uploads/             # Uploaded PDFs stored here
│   ├── server.js            # All routes and logic
│   └── .env                 # Environment variables
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Navbar.tsx
        │   ├── TeacherDashboard.tsx
        │   ├── StudentDashboard.tsx
        │   ├── ResultsModal.tsx
        │   ├── GeminiLoader.tsx
        │   ├── ConfirmModal.tsx
        │   └── Toast.tsx
        ├── App.tsx
        ├── App.css
        └── index.tsx
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Google Gemini API key

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd ai-eval-app
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:
```env
MONGODB_URI=mongodb://localhost:27017/ai-eval
JWT_SECRET=your_jwt_secret_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

Start the backend:
```bash
node server.js
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm start
```

The app runs at `http://localhost:3000`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register a new user (teacher or student) |
| POST | `/api/login` | Login and receive JWT token |

### Classes
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/create-class` | Teacher | Create a class, get a 6-char join code |
| GET | `/api/my-classes` | Teacher | Get all classes with student lists |
| DELETE | `/api/delete-class/:id` | Teacher | Delete a class |
| POST | `/api/join-class` | Student | Join a class using a code |
| GET | `/api/my-joined-classes` | Student | Get all joined classes |
| POST | `/api/leave-class/:id` | Student | Leave a class |

### Papers
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/create-paper` | Teacher | Upload PDF, AI generates answer key |
| GET | `/api/my-papers` | Teacher | Get all papers created by teacher |
| PUT | `/api/update-paper/:id` | Teacher | Update answer key manually |
| PUT | `/api/approve-paper/:id` | Teacher | Make paper visible to students |
| DELETE | `/api/delete-paper/:id` | Teacher | Delete paper and all submissions |
| GET | `/api/paper-results/:id` | Teacher | Get all student submissions for a paper |
| GET | `/api/approved-papers` | Student | Get approved papers for joined classes |

### Submissions
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/submit-answer/:paperId` | Student | Upload answer PDF, AI grades it |
| GET | `/api/my-submissions` | Student | Get all submissions by the student |

---

## 🔐 Authentication Flow

1. User registers with name, email, password, and role (`teacher` or `student`)
2. Password is hashed with bcrypt before saving
3. On login, a JWT token is returned and stored in `localStorage`
4. All protected routes use the `auth` middleware which verifies the token and attaches `req.user`

---

## 🏫 Class System Flow

```
Teacher creates class
        ↓
Gets a unique 6-character code (e.g. A3F9C2)
        ↓
Shares code with students
        ↓
Students enter code to join the class
        ↓
Teacher uploads a paper and assigns it to the class
        ↓
Only students in that class can see and submit to that paper
```

Papers with no class assigned are visible to all students.

---

## 📊 Grading Flow

```
Teacher uploads question paper PDF
        ↓
Gemini reads PDF → extracts questions, expected answers, max marks
        ↓
Teacher reviews and edits the answer key
        ↓
Teacher approves the paper (makes it live)
        ↓
Student uploads their answer sheet PDF
        ↓
Gemini compares student answers against the answer key
        ↓
Returns: awarded_marks, max_marks, feedback per question
        ↓
Total score and percentage calculated and stored
        ↓
Student sees results with per-question breakdown
```

---

## 🎨 UI Features

- **Dark / Light theme** toggle (saved to localStorage)
- **Collapsible sidebar** with class-wise stats that update when you select a class filter
- **Toast notifications** replacing all browser alerts
- **Gemini loader** with funny messages while AI is working
- **Score progress bars** on submission cards
- **CSV export** of class results
- **Sort** results by score or date
- **Search** papers by title
- **Confirm modal** for destructive actions
- **Answer key editor** — click any row to open a focused edit modal with Prev/Next navigation

---

## 🌐 Deployment

### Backend (Render)
1. Push code to GitHub
2. Create a new Web Service on [render.com](https://render.com)
3. Set root directory to `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`

### Frontend (Vercel / Netlify)
1. Set root directory to `frontend`
2. Build command: `npm run build`
3. Output directory: `build`

> Make sure all API URLs in the frontend point to your deployed backend URL.

---

## 📝 Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `GEMINI_API_KEY` | Google Gemini API key from [Google AI Studio](https://aistudio.google.com) |
| `PORT` | Server port (default: 5000) |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
