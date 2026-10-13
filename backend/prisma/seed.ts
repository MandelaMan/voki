import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { adminService } from '../src/services/admin.service';
import { prisma as appPrisma } from '../src/utils/prisma';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_USER_EMAIL || 'test@voki.local';
  const password = process.env.TEST_USER_PASSWORD || 'password123';
  const firstName = process.env.TEST_USER_FIRST_NAME || 'Test';
  const lastName = process.env.TEST_USER_LAST_NAME || 'User';

  const hashedPassword = await bcrypt.hash(password, 12);
  const adminEmails = (process.env.SUPER_ADMIN_EMAIL || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const role = adminEmails.includes(email.trim().toLowerCase()) ? 'SUPER_ADMIN' as const : 'USER' as const;
  const existing = await prisma.user.findUnique({ where: { email } });
  const previousEmail = 'test@voki.local';
  const previous =
    email !== previousEmail
      ? await prisma.user.findUnique({ where: { email: previousEmail } })
      : null;
  const target = existing ?? previous;

  if (target) {
    await prisma.user.update({
      where: { id: target.id },
      data: { email, password: hashedPassword, firstName, lastName, role },
    });
    console.log(`Updated test user: ${email}`);
    return;
  }

  await prisma.user.create({
    data: { email, password: hashedPassword, firstName, lastName, role },
  });

  console.log(`Created test user: ${email}`);
}

main()
  .then(() => adminService.ensureConfiguredAdmin())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await appPrisma.$disconnect();
  });
