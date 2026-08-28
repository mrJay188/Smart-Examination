import express from 'express';
import { prisma } from '../server.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { requireSEB } from '../middleware/seb.middleware.js';

const router = express.Router();

// Get exams (Students see assigned/available, Admins see all)
router.get('/', authenticate, async (req, res) => {
  try {
    // If student, filter by their groupId (or exams with no groupId)
    let whereClause = {};
    if (req.user.role === 'STUDENT') {
      const student = await prisma.user.findUnique({ where: { id: req.user.userId } });
      whereClause = {
        OR: [
          { groupId: null },
          { groupId: student.groupId }
        ]
      };
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        _count: { select: { questions: true } },
        group: { select: { name: true } },
        results: { where: { userId: req.user.userId } }
      }
    });
    res.json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exams' });
  }
});

// Admin: Create Exam
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { title, description, duration, startTime, endTime, groupId } = req.body;
  try {
    const newExam = await prisma.exam.create({
      data: { 
        title, 
        description, 
        duration: parseInt(duration), 
        startTime: new Date(startTime), 
        endTime: new Date(endTime),
        groupId: groupId ? parseInt(groupId) : null
      }
    });
    res.status(201).json(newExam);
  } catch (error) {
    res.status(500).json({ message: 'Error creating exam' });
  }
});

// Admin: Update Exam
router.put('/:examId', authenticate, requireAdmin, async (req, res) => {
  const { examId } = req.params;
  const { title, duration, groupId } = req.body;
  try {
    const updatedExam = await prisma.exam.update({
      where: { id: parseInt(examId) },
      data: { 
        title, 
        duration: parseInt(duration),
        groupId: groupId ? parseInt(groupId) : null
      }
    });
    res.json(updatedExam);
  } catch (error) {
    res.status(500).json({ message: 'Error updating exam' });
  }
});

// Admin: Delete Exam
router.delete('/:examId', authenticate, requireAdmin, async (req, res) => {
  const { examId } = req.params;
  try {
    await prisma.exam.delete({
      where: { id: parseInt(examId) }
    });
    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting exam' });
  }
});

// Admin: Add Question to Exam
router.post('/:examId/questions', authenticate, requireAdmin, async (req, res) => {
  const { examId } = req.params;
  const { text, type, options, correctAnswer } = req.body;

  try {
    const question = await prisma.question.create({
      data: {
        examId: parseInt(examId),
        text,
        type,
        options: options || [],
        correctAnswer
      }
    });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Error adding question' });
  }
});

// Admin: Update Question
router.put('/:examId/questions/:questionId', authenticate, requireAdmin, async (req, res) => {
  const { questionId } = req.params;
  const { text, options, correctAnswer } = req.body;
  try {
    const updated = await prisma.question.update({
      where: { id: parseInt(questionId) },
      data: { text, options, correctAnswer }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating question' });
  }
});

// Admin: Delete Question
router.delete('/:examId/questions/:questionId', authenticate, requireAdmin, async (req, res) => {
  const { questionId } = req.params;
  try {
    await prisma.question.delete({
      where: { id: parseInt(questionId) }
    });
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting question' });
  }
});

// Student: Fetch specific exam with questions (without correct answers if possible, but keeping it simple for now)
router.get('/:examId', authenticate, async (req, res) => {
  const { examId } = req.params;
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            options: true
            // not selecting correctAnswer to prevent cheating via API
          }
        }
      }
    });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exam' });
  }
});

// Student: Start Exam (Creates Result row or returns existing)
router.post('/:examId/start', authenticate, requireSEB, async (req, res) => {
  const { examId } = req.params;
  try {
    const existing = await prisma.result.findUnique({
      where: { userId_examId: { userId: req.user.userId, examId: parseInt(examId) } }
    });
    
    if (existing) {
      if (existing.status !== 'IN_PROGRESS') {
        return res.status(403).json({ message: 'Exam already submitted.' });
      }
      return res.json({ startTime: existing.startTime, answers: existing.answers || {} });
    }

    const result = await prisma.result.create({
      data: {
        examId: parseInt(examId),
        userId: req.user.userId,
        status: 'IN_PROGRESS'
      }
    });
    res.status(201).json({ startTime: result.startTime, answers: {} });
  } catch (error) {
    res.status(500).json({ message: 'Error starting exam' });
  }
});

// Student: Autosave answers
router.post('/:examId/autosave', authenticate, async (req, res) => {
  const { examId } = req.params;
  const { answers } = req.body;
  try {
    await prisma.result.update({
      where: { userId_examId: { userId: req.user.userId, examId: parseInt(examId) } },
      data: { answers }
    });
    res.json({ message: 'Autosaved' });
  } catch (error) {
    // Fail silently for autosave
    res.status(500).json({ message: 'Error autosaving' });
  }
});

// Student: Submit Exam Result
router.post('/:examId/submit', authenticate, requireSEB, async (req, res) => {
  const { examId } = req.params;
  const { answers, force } = req.body;
  try {
    // Verify it's not already submitted
    const existing = await prisma.result.findUnique({
      where: { userId_examId: { userId: req.user.userId, examId: parseInt(examId) } }
    });
    
    if (!existing || existing.status !== 'IN_PROGRESS') {
      return res.status(403).json({ message: 'Exam not in progress or already submitted' });
    }

    // Fetch the exam questions to grade the answers
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) },
      include: { questions: true }
    });

    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    let correctCount = 0;
    const totalQuestions = exam.questions.length;

    if (totalQuestions > 0) {
      exam.questions.forEach(q => {
        // answers object is { [questionId]: "Selected Option" }
        if (answers && answers[q.id] === q.correctAnswer) {
          correctCount++;
        }
      });
    }

    // Calculate percentage score (rounded to nearest integer)
    const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const result = await prisma.result.update({
      where: { id: existing.id },
      data: {
        score: finalScore,
        answers: answers || {},
        status: force ? 'FORCE_SUBMITTED' : 'SUBMITTED'
      }
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting exam' });
  }
});

// Proctoring: Log suspicious activity
router.post('/:examId/proctor', authenticate, async (req, res) => {
  const { examId } = req.params;
  const { eventType, severity, screenshot } = req.body;
  try {
    const event = await prisma.proctoringEvent.create({
      data: {
        examId: parseInt(examId),
        userId: req.user.userId,
        eventType,
        severity,
        screenshot
      }
    });
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error logging proctor event' });
  }
});

// Admin: Fetch Results and Proctoring Events for an Exam
router.get('/:examId/results', authenticate, requireAdmin, async (req, res) => {
  const { examId } = req.params;
  try {
    const results = await prisma.result.findMany({
      where: { examId: parseInt(examId) },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const proctoringEvents = await prisma.proctoringEvent.findMany({
      where: { examId: parseInt(examId) }
    });

    // Group flags by user
    const formattedResults = results.map(result => {
      const userFlags = proctoringEvents.filter(e => e.userId === result.userId);
      return {
        ...result,
        flags: userFlags
      };
    });

    res.json(formattedResults);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results' });
  }
});

// Admin: Generate Invite Link
router.post('/:examId/invite', authenticate, requireAdmin, async (req, res) => {
  const { examId } = req.params;
  const { userId } = req.body; // Specific student
  try {
    // Check if exam exists
    const exam = await prisma.exam.findUnique({ where: { id: parseInt(examId) } });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Generate random secure token
    import('crypto').then(async (crypto) => {
      const token = crypto.randomBytes(32).toString('hex');
      const invite = await prisma.examInvitation.create({
        data: {
          examId: parseInt(examId),
          userId: parseInt(userId),
          token
        }
      });
      res.status(201).json({ inviteUrl: `http://localhost:5173/invite/${invite.token}` });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating invite' });
  }
});

export default router;
