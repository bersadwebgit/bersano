#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function getArg(argName) {
  const index = process.argv.indexOf(argName);
  if (index !== -1 && index + 1 < process.argv.length) {
    return process.argv[index + 1];
  }
  // Try with = sign e.g. --email=test@test.com
  const argWithEqual = process.argv.find(a => a.startsWith(`${argName}=`));
  if (argWithEqual) {
    return argWithEqual.split('=')[1];
  }
  return null;
}

async function main() {
  try {
    const email = getArg('--email');
    const name = getArg('--name') || 'مدیر اصلی پلتفرم';
    
    // Password priority: environment variable first, then command-line argument
    const password = process.env.SUPERADMIN_PASSWORD || getArg('--password');

    if (!email) {
      console.error('❌ Error: --email argument is required.');
      process.exit(1);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Error: Provided email format is invalid.');
      process.exit(1);
    }

    if (!password) {
      console.error('❌ Error: Password is required. Use SUPERADMIN_PASSWORD env var or --password argument.');
      process.exit(1);
    }

    if (password.length < 12) {
      console.error('❌ Error: Password must be at least 12 characters long.');
      process.exit(1);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Look for existing user with the same email and shopId: 'system'
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        shopId: 'system',
      },
    });

    if (existingUser) {
      // Update existing user's password, role, and name
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          role: 'superadmin',
          name: name,
        },
      });
      console.log(JSON.stringify({ status: 'UPDATED', email: normalizedEmail }));
    } else {
      // Create new superadmin user
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          role: 'superadmin',
          shopId: 'system',
          name: name,
        },
      });
      console.log(JSON.stringify({ status: 'CREATED', email: normalizedEmail }));
    }
  } catch (error) {
    console.error('❌ Fatal script error:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
