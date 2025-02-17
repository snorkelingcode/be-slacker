-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "url" TEXT NOT NULL,
    "genre" TEXT,
    "duration" DOUBLE PRECISION DEFAULT 0,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackLike" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "TrackLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_url_key" ON "Track"("url");

-- CreateIndex
CREATE UNIQUE INDEX "TrackLike_userId_trackId_key" ON "TrackLike"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackLike" ADD CONSTRAINT "TrackLike_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
