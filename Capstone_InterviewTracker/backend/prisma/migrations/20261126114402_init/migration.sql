-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HR', 'PANEL', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'CONTRACT', 'REMOTE');

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('PROFILING', 'SCREENING', 'L1_TECHNICAL', 'L2_TECHNICAL', 'HR_ROUND');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PROFILING_COMPLETED', 'IN_PROGRESS', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "Round" AS ENUM ('L1', 'L2');

-- CreateEnum
CREATE TYPE "Result" AS ENUM ('SELECTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileCode" TEXT,
    "mobile" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organization" TEXT,
    "designation" TEXT,
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "minExperience" INTEGER NOT NULL,
    "maxExperience" INTEGER NOT NULL,
    "minSalary" INTEGER NOT NULL,
    "maxSalary" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "resumeFile" TEXT NOT NULL,
    "currentOrganization" TEXT,
    "totalExperience" DOUBLE PRECISION NOT NULL,
    "relevantExperience" DOUBLE PRECISION NOT NULL,
    "currentCtc" DOUBLE PRECISION NOT NULL,
    "expectedCtc" DOUBLE PRECISION NOT NULL,
    "noticePeriodDays" INTEGER NOT NULL,
    "preferredLocation" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "stage" "Stage" NOT NULL DEFAULT 'PROFILING',
    "status" "CandidateStatus" NOT NULL DEFAULT 'PROFILING_COMPLETED',
    "finalComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "round" "Round" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "focusAreas" TEXT NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPanel" (
    "interviewId" INTEGER NOT NULL,
    "panelId" INTEGER NOT NULL,

    CONSTRAINT "InterviewPanel_pkey" PRIMARY KEY ("interviewId","panelId")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" SERIAL NOT NULL,
    "interviewId" INTEGER NOT NULL,
    "panelId" INTEGER NOT NULL,
    "comments" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "areasCovered" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "result" "Result" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_tokenHash_key" ON "User"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileCode_mobile_key" ON "User"("mobileCode", "mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");

-- CreateIndex
CREATE INDEX "Candidate_jobId_stage_status_idx" ON "Candidate"("jobId", "stage", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Interview_candidateId_round_key" ON "Interview"("candidateId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_interviewId_panelId_key" ON "Feedback"("interviewId", "panelId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanel" ADD CONSTRAINT "InterviewPanel_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPanel" ADD CONSTRAINT "InterviewPanel_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
