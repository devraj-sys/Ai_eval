require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const User = require('./models/User');
const Paper = require('./models/Paper');
const Submission = require('./models/Submission');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-eval')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Configure Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY );

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Helper function
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString('base64'),
      mimeType
    },
  };
}

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    console.log('Registering user:', { name, email, role });
    
    const user = new User({ name, email, password, role });
    await user.save();
    console.log('User saved successfully:', user._id);
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, name, email, role } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Teacher Routes
app.post('/api/create-paper', auth, upload.single('questionPaper'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { title } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You will be given a question paper PDF.
Generate a JSON array with each object containing:
- question_number
- expected_answer
- max_marks
Only output pure JSON (no explanations, no markdown).
    `;

    const imagePart = fileToGenerativePart(req.file.path, 'application/pdf');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const answerKey = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    const paper = new Paper({
      title,
      teacherId: req.user._id,
      questionPaperPath: req.file.path,
      answerKey
    });

    await paper.save();
    res.json({ paper });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create paper' });
  }
});

app.put('/api/update-paper/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { answerKey } = req.body;
    const paper = await Paper.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      { answerKey },
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    res.json({ paper });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update paper' });
  }
});

app.put('/api/approve-paper/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paper = await Paper.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      { isApproved: true },
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    res.json({ paper });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve paper' });
  }
});

app.get('/api/my-papers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const papers = await Paper.find({ teacherId: req.user._id });
    res.json({ papers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get papers' });
  }
});

app.delete('/api/delete-paper/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paper = await Paper.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    // Delete associated submissions
    await Submission.deleteMany({ paperId: req.params.id });
    
    // Delete the file
    if (fs.existsSync(paper.questionPaperPath)) {
      fs.unlinkSync(paper.questionPaperPath);
    }

    res.json({ message: 'Paper deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete paper' });
  }
});

app.get('/api/paper-results/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paper = await Paper.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found' });
    }

    const submissions = await Submission.find({ paperId: req.params.id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ paper: paper.title, submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// Student Routes
app.get('/api/approved-papers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const papers = await Paper.find({ isApproved: true })
      .populate('teacherId', 'name')
      .select('title teacherId createdAt');
    res.json({ papers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get papers' });
  }
});

app.post('/api/submit-answer/:paperId', auth, upload.single('studentAnswer'), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const paper = await Paper.findOne({ _id: req.params.paperId, isApproved: true });
    if (!paper) {
      return res.status(404).json({ error: 'Paper not found or not approved' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are an examiner. 
You will receive:
1. A student answer PDF
2. The official answer key (below in JSON)

xIMPORTANT GRADING RULES:
- For Multiple Choice Questions (MCQs): Award FULL marks if the selected option matches the expected answer, 0 marks otherwise
- For descriptive questions: Award partial marks based on content quality and correctness
- Be lenient with formatting differences (A vs a, spacing, etc.)
- Focus on the actual answer content, not presentation

Return *ONLY* a JSON array. Each object should contain:
- question_number
- awarded_marks
- max_marks
- feedback

Here is the official key:
${JSON.stringify(paper.answerKey, null, 2)}
    `;

    const imagePart = fileToGenerativePart(req.file.path, 'application/pdf');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const gradingResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    const totalMarks = gradingResult.reduce((sum, item) => sum + item.awarded_marks, 0);
    const maxTotalMarks = gradingResult.reduce((sum, item) => sum + item.max_marks, 0);
    const percentage = ((totalMarks / maxTotalMarks) * 100).toFixed(2);

    const submission = new Submission({
      studentId: req.user._id,
      paperId: req.params.paperId,
      answerSheetPath: req.file.path,
      gradingResult,
      totalMarks,
      maxTotalMarks,
      percentage: parseFloat(percentage)
    });

    console.log('Saving submission:', submission);
    await submission.save();
    console.log('Submission saved successfully:', submission._id);
    res.json({ submission });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

app.get('/api/my-submissions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('paperId', 'title')
      .sort({ createdAt: -1 });
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});