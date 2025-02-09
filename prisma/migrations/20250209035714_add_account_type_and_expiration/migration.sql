/*
  Warnings:

  - You are about to drop the column `accountType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "accountType",
DROP COLUMN "expiresAt",
ALTER COLUMN "bio" SET DEFAULT 'New to Slacker';
