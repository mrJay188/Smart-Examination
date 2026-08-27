import express from 'express';
import { prisma } from '../server.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// GET all students (Paginated & Filtered)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const groupId = req.query.groupId;

    const skip = (page - 1) * limit;

    let whereClause = {
      role: 'STUDENT',
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } }
        ]
      }),
      ...(groupId && groupId !== 'null' && { groupId: parseInt(groupId) }),
      ...(groupId === 'null' && { groupId: null })
    };

    const users = await prisma.user.findMany({
      where: whereClause,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        group: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalCount = await prisma.user.count({ where: whereClause });

    res.json({
      users,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// BULK IMPORT Students
router.post('/bulk-import', authenticate, requireAdmin, async (req, res) => {
  const { students } = req.body; // Expects array of { name, email, password, groupId }
  try {
    const hashedStudents = await Promise.all(students.map(async (s) => ({
      name: s.name,
      email: s.email,
      password: await bcrypt.hash(s.password, 10),
      role: 'STUDENT',
      groupId: s.groupId ? parseInt(s.groupId) : null
    })));

    const created = await prisma.user.createMany({
      data: hashedStudents,
      skipDuplicates: true
    });

    res.status(201).json({ message: `Successfully imported ${created.count} students` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error in bulk import' });
  }
});

// GET Detailed Student Profile
router.get('/:userId/profile', authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, name: true, email: true, status: true, group: true }
    });

    const results = await prisma.result.findMany({
      where: { userId: parseInt(userId) },
      include: { exam: { select: { title: true } } }
    });

    const proctoringEvents = await prisma.proctoringEvent.findMany({
      where: { userId: parseInt(userId) }
    });

    const avgScore = results.length > 0 
      ? results.reduce((acc, curr) => acc + curr.score, 0) / results.length 
      : 0;

    res.json({
      user,
      stats: {
        totalExams: results.length,
        averageScore: avgScore,
        totalFlags: proctoringEvents.length
      },
      results,
      proctoringEvents
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// TOGGLE Student Status
router.put('/:userId/status', authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body; // 'ACTIVE' or 'SUSPENDED'
  try {
    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating status' });
  }
});

// UPDATE Student Group
router.put('/:userId/group', authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { groupId } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { groupId: groupId ? parseInt(groupId) : null }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Error updating group' });
  }
});

// UPDATE Student Password
router.put('/:userId/password', authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword }
    });
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password' });
  }
});

router.delete('/:userId', authenticate, requireAdmin, async (req, res) => {
  const { userId } = req.params;
  try {
    await prisma.user.delete({
      where: { id: parseInt(userId) }
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

export default router;
