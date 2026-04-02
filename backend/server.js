require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const User = require('./models/User');
const Paper = require('./models/Paper');
const Submission = require('./models/Submission');
const Class = require('./models/Class');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-eval')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

mongoose.connection.on('error', err => console.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => { fs.ensureDirSync('uploads'); cb(null, 'uploads'); },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage });

function fileToGenerativePart(filePath, mimeType) {
  return { inlineData: { data: Buffer.from(fs.readFileSync(filePath)).toString('base64'), mimeType } };
}

function generateClassCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F9C2"
}

// ── Auth Routes ──────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const user = new User({ name, email, password, role });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret');
    res.json({ token, user: { id: user._id, name, email, role } });
  } catch (error) {
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

// ── Class Routes ─────────────────────────────────────────────

// Teacher: create class
app.post('/api/create-class', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name is required' });

    let code, exists = true;
    while (exists) {
      code = generateClassCode();
      exists = await Class.findOne({ code });
    }

    const cls = new Class({ name, teacherId: req.user._id, code, students: [] });
    await cls.save();
    res.json({ class: cls });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// Teacher: get my classes
app.get('/api/my-classes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const classes = await Class.find({ teacherId: req.user._id })
      .populate('students', 'name email');
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get classes' });
  }
});

// Teacher: delete class
app.delete('/api/delete-class/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const cls = await Class.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    // Remove classId from papers belonging to this class
    await Paper.updateMany({ classId: req.params.id }, { classId: null });
    res.json({ message: 'Class deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Student: join class by code
app.post('/api/join-class', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });
    const { code } = req.body;
    const cls = await Class.findOne({ code: code.toUpperCase() });
    if (!cls) return res.status(404).json({ error: 'Invalid class code' });
    if (cls.students.includes(req.user._id)) {
      return res.status(400).json({ error: 'Already a member of this class' });
    }
    cls.students.push(req.user._id);
    await cls.save();
    const populated = await Class.findById(cls._id).populate('teacherId', 'name');
    res.json({ class: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join class' });
  }
});

// Student: get my joined classes
app.get('/api/my-joined-classes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });
    const classes = await Class.find({ students: req.user._id })
      .populate('teacherId', 'name');
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get classes' });
  }
});

// Student: leave class
app.post('/api/leave-class/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    cls.students = cls.students.filter(s => s.toString() !== req.user._id.toString());
    await cls.save();
    res.json({ message: 'Left class successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave class' });
  }
});

// ── Teacher Paper Routes ──────────────────────────────────────

app.post('/api/create-paper', auth, upload.single('questionPaper'), async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });

    const { title, classId } = req.body;
    const resolvedClassId = classId && classId.trim() !== '' ? classId.trim() : null;

    if (!resolvedClassId) return res.status(400).json({ error: 'A class must be selected for the paper' });

    const cls = await Class.findOne({ _id: resolvedClassId, teacherId: req.user._id });
    if (!cls) return res.status(403).json({ error: 'Class not found or access denied' });

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
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const answerKey = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    const paper = new Paper({
      title,
      teacherId: req.user._id,
      classId: resolvedClassId,
      questionPaperPath: req.file.path,
      answerKey
    });

    await paper.save();
    const populated = await Paper.findById(paper._id).populate('classId', 'name');
    res.json({ paper: populated });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Failed to create paper', message: error.message });
  }
});

app.put('/api/update-paper/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const { answerKey } = req.body;
    const paper = await Paper.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      { answerKey },
      { new: true }
    );
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    res.json({ paper });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update paper' });
  }
});

app.put('/api/approve-paper/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const paper = await Paper.findOneAndUpdate(
      { _id: req.params.id, teacherId: req.user._id },
      { isApproved: true },
      { new: true }
    );
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    res.json({ paper });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve paper' });
  }
});

app.get('/api/my-papers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const papers = await Paper.find({ teacherId: req.user._id })
      .populate({ path: 'classId', select: 'name', options: { strictPopulate: false } });
    res.json({ papers });
  } catch (error) {
    console.error('my-papers error:', error.message);
    res.status(500).json({ error: 'Failed to get papers', message: error.message });
  }
});

app.delete('/api/delete-paper/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const paper = await Paper.findOneAndDelete({ _id: req.params.id, teacherId: req.user._id });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    await Submission.deleteMany({ paperId: req.params.id });
    if (fs.existsSync(paper.questionPaperPath)) fs.unlinkSync(paper.questionPaperPath);
    res.json({ message: 'Paper deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete paper' });
  }
});

app.get('/api/paper-results/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Access denied' });
    const paper = await Paper.findOne({ _id: req.params.id, teacherId: req.user._id });
    if (!paper) return res.status(404).json({ error: 'Paper not found' });
    const submissions = await Submission.find({ paperId: req.params.id })
      .populate('studentId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ paper: paper.title, submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// ── Student Paper Routes ──────────────────────────────────────

// Returns approved papers only for classes the student has joined (or global papers with no class)
app.get('/api/approved-papers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });

    // Get classes the student has joined
    const joinedClasses = await Class.find({ students: req.user._id }).select('_id');
    const joinedClassIds = joinedClasses.map(c => c._id);

    // Papers that are approved AND (belong to a joined class OR have no class)
    const papers = await Paper.find({
      isApproved: true,
      $or: [
        { classId: null },
        { classId: { $in: joinedClassIds } }
      ]
    })
      .populate('teacherId', 'name')
      .populate('classId', 'name')
      .select('title teacherId classId createdAt');

    res.json({ papers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get papers' });
  }
});

app.post('/api/submit-answer/:paperId', auth, upload.single('studentAnswer'), async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });

    const paper = await Paper.findOne({ _id: req.params.paperId, isApproved: true });
    if (!paper) return res.status(404).json({ error: 'Paper not found or not approved' });

    // If paper belongs to a class, verify student is a member
    if (paper.classId) {
      const cls = await Class.findOne({ _id: paper.classId, students: req.user._id });
      if (!cls) return res.status(403).json({ error: 'You are not a member of this class' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are an examiner. 
You will receive:
1. A student answer PDF
2. The official answer key (below in JSON)

IMPORTANT GRADING RULES:
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
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    const gradingResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    const totalMarks = gradingResult.reduce((sum, item) => sum + item.awarded_marks, 0);
    const maxTotalMarks = gradingResult.reduce((sum, item) => sum + item.max_marks, 0);
    const percentage = parseFloat(((totalMarks / maxTotalMarks) * 100).toFixed(2));

    const submission = new Submission({
      studentId: req.user._id,
      paperId: req.params.paperId,
      answerSheetPath: req.file.path,
      gradingResult,
      totalMarks,
      maxTotalMarks,
      percentage
    });

    await submission.save();
    res.json({ submission });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

app.get('/api/my-submissions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate('paperId', 'title')
      .sort({ createdAt: -1 });
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get submissions' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
