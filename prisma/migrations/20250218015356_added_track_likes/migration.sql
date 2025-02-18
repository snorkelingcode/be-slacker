/*
  Warnings:

  - You are about to drop the column `duration` on the `Track` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedBy` on the `Track` table. All the data in the column will be lost.
  - Added the required column `fileType` to the `Track` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploaderId` to the `Track` table without a default value. This is not possible if the table is not empty.
  - Made the column `artist` on table `Track` required. This step will fail if there are existing NULL values in that column.
  - Made the column `genre` on table `Track` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Track" DROP CONSTRAINT "Track_uploadedBy_fkey";

-- DropForeignKey
ALTER TABLE "TrackLike" DROP CONSTRAINT "TrackLike_trackId_fkey";

-- DropIndex
DROP INDEX "Track_url_key";

-- AlterTable
ALTER TABLE "Track" DROP COLUMN "duration",
DROP COLUMN "uploadedBy",
ADD COLUMN     "fileType" TEXT NOT NULL,
ADD COLUMN     "uploaderId" TEXT NOT NULL,
ALTER COLUMN "artist" SET NOT NULL,
ALTER COLUMN "genre" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
