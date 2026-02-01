import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Role enum 값 정의
const Role = {
  admin: 'admin',
  operator: 'operator',
  viewer: 'viewer',
} as const;

async function main() {
  console.log('Seeding database...');

  // 기본 관리자 계정 생성
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: Role.admin,
      isActive: true,
      settings: {
        create: {
          refreshInterval: 30,
          theme: 'system',
          language: 'ko',
        },
      },
    },
  });

  console.log(`Created admin user: ${admin.username}`);

  // 시스템 기본 설정
  await prisma.systemSettings.upsert({
    where: { key: 'app.initialized' },
    update: { value: { initialized: true, version: '1.0.0' } },
    create: {
      key: 'app.initialized',
      value: { initialized: true, version: '1.0.0' },
    },
  });

  console.log('System settings initialized');
  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
