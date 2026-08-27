import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartexam.com' },
    update: {},
    create: {
      email: 'admin@smartexam.com',
      name: 'System Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@smartexam.com' },
    update: {},
    create: {
      email: 'student@smartexam.com',
      name: 'Test Student',
      password: studentPassword,
      role: 'STUDENT',
    },
  });

  console.log('Seeding finished!');
  console.log('Admin Email:', admin.email);
  console.log('Student Email:', student.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
