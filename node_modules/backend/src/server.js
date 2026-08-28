import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import { Server } from 'socket.io';

// Routes
import authRoutes from './routes/auth.routes.js';
import examRoutes from './routes/exam.routes.js';
import userRoutes from './routes/user.routes.js';
import groupRoutes from './routes/group.routes.js';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Smart Exam API is running' });
});

// Setup Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_exam', (data) => {
    socket.join(`exam_${data.examId}`);
    if (data.userId) socket.join(`user_${data.userId}`);
  });

  socket.on('proctor_alert', (data) => {
    io.to(`exam_${data.examId}`).emit('admin_alert', data);
  });

  socket.on('terminate_student', (data) => {
    io.to(`user_${data.userId}`).emit('force_terminate', { reason: 'Admin intervention' });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Keep-alive ping to prevent Render free-tier from sleeping
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (selfUrl) {
    console.log(`Keep-alive enabled for ${selfUrl}`);
    setInterval(() => {
      fetch(`${selfUrl}/api/health`)
        .then(res => console.log(`[Keep-Alive] Pinged self successfully at ${new Date().toISOString()}`))
        .catch(err => console.error(`[Keep-Alive] Ping failed:`, err.message));
    }, 14 * 60 * 1000); // Ping every 14 minutes
  }
});
