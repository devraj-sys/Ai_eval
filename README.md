# AI Evaluation System

A web application for automated evaluation of student answer sheets using Google Gemini AI.

## Features

- **Teacher Dashboard**: Upload question papers, generate answer keys with AI, edit and approve answer keys
- **Student Dashboard**: Upload answer sheets and get automated grading with detailed feedback
- **AI-Powered**: Uses Google Gemini 2.5 Flash model for intelligent evaluation

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Backend (Node.js)

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update .env file with your values:
```
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-eval-system
JWT_SECRET=your_jwt_secret_here
```

5. Start MongoDB (if running locally):
```bash
mongod
```

6. Start the server:
```bash
npm run dev
```

The backend will run on http://localhost:5000

### Frontend (React)

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on http://localhost:3000

## Usage

1. **Registration/Login**:
   - Register as either Teacher or Student
   - Login with your credentials

2. **Teacher Workflow**:
   - Create new papers by uploading question paper PDFs
   - AI automatically generates answer keys
   - Edit the generated answer key if needed
   - Approve papers to make them available to students

3. **Student Workflow**:
   - Select from approved papers uploaded by teachers
   - Upload your answer sheet PDF for the selected paper
   - Get automated grading with detailed feedback
   - View all your past submissions and results

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user

### Teacher Routes
- `POST /api/create-paper` - Create new paper with answer key
- `PUT /api/update-paper/:id` - Update paper answer key
- `PUT /api/approve-paper/:id` - Approve paper
- `GET /api/my-papers` - Get teacher's papers

### Student Routes
- `GET /api/approved-papers` - Get approved papers
- `POST /api/submit-answer/:paperId` - Submit answer for grading
- `GET /api/my-submissions` - Get student's submissions

## Database Schema

- **Users**: Store teacher and student accounts
- **Papers**: Store question papers and answer keys
- **Submissions**: Store student submissions and grades

## Features Added

- User authentication with JWT
- Role-based access (Teacher/Student)
- Paper management system
- Student paper selection
- Submission history
- MongoDB integration