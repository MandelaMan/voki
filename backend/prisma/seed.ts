import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TEST_USER_EMAIL || 'test@voki.local';
  const password = process.env.TEST_USER_PASSWORD || 'password123';
  const firstName = process.env.TEST_USER_FIRST_NAME || 'Test';
  const lastName = process.env.TEST_USER_LAST_NAME || 'User';

  const hashedPassword = await bcrypt.hash(password, 12);
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
      data: { email, password: hashedPassword, firstName, lastName },
    });
    console.log(`Updated test user: ${email}`);
    return;
  }

  await prisma.user.create({
    data: { email, password: hashedPassword, firstName, lastName },
  });

  console.log(`Created test user: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
