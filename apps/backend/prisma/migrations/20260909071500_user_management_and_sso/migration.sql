-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'APPLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL';
ALTER TABLE "users" ADD COLUMN "authProviderId" TEXT;
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user_logs" ADD CONSTRAINT "user_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
