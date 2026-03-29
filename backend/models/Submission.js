const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  answerSheetPath: { type: String, required: true },
  gradingResult: [{
    question_number: Number,
    awarded_marks: Number,
    max_marks: Number,
    feedback: String
  }],
  totalMarks: { type: Number, default: 0 },
  maxTotalMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);