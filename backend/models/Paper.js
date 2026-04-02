const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  questionPaperPath: { type: String, required: true },
  answerKey: [{ 
    question_number: Number,
    expected_answer: String,
    max_marks: Number
  }],
  isApproved: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Paper', paperSchema);
