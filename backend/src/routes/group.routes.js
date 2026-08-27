import express from 'express';
import { prisma } from '../server.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: { users: true, exams: true }
        }
      }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  try {
    const group = await prisma.group.create({
      data: { name, description }
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group' });
  }
});

router.delete('/:groupId', authenticate, requireAdmin, async (req, res) => {
  const { groupId } = req.params;
  try {
    await prisma.group.delete({
      where: { id: parseInt(groupId) }
    });
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting group' });
  }
});

export default router;
