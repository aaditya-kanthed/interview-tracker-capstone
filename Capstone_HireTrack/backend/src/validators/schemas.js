// All input rules in one place (replaces @NotBlank, @Email, @Min, @Max ... in Java DTOs)
const { z } = require('zod');
const { STAGES, STATUS } = require('../utils/constants');

// HTML forms send "" for empty optional fields; treat "" as "not given"
const optional = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const id = z.coerce.number().int().positive();
const name = z.string().trim().min(2).max(100);
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const mobileCode = z
  .string()
  .trim()
  .regex(/^\+\d{1,4}$/, 'Use a code like +91');
const mobile = z
  .string()
  .trim()
  .regex(/^\d{7,15}$/, 'Mobile must be 7 to 15 digits');
const comments = z.string().trim().min(5, 'Comments are required').max(2000);

const registerSchema = z.object({ fullName: name, email, password });
const loginSchema = z.object({ email, password: z.string().min(1) });
const setPasswordSchema = z.object({ token: z.string().min(10), password });
const googleLoginSchema = z.object({ credential: z.string().min(20).max(5000) });
const changePasswordSchema = z.object({
  currentPassword: z.string().max(72).optional(),
  newPassword: password,
});

const jobSchema = z
  .object({
    title: z.string().trim().min(2).max(150),
    description: z.string().trim().min(10).max(5000),
    skills: z.array(z.string().trim().min(1)).min(1, 'Add at least one skill'),
    minExperience: z.number().int().min(0).max(40),
    maxExperience: z.number().int().min(0).max(40),
    minSalary: z.number().int().min(0),
    maxSalary: z.number().int().min(0),
    location: z.string().trim().min(2).max(100),
    jobType: z.enum(['FULL_TIME', 'CONTRACT', 'REMOTE']),
  })
  .refine((d) => d.minExperience <= d.maxExperience, {
    message: 'Min experience cannot be more than max',
    path: ['maxExperience'],
  })
  .refine((d) => d.minSalary <= d.maxSalary, {
    message: 'Min salary cannot be more than max',
    path: ['maxSalary'],
  });

// Candidate form arrives as multipart/form-data, so every value is a string -> z.coerce
const candidateSchema = z
  .object({
    fullName: optional(name), // required only when HR creates the profile
    email: optional(email),
    mobileCode,
    mobile,
    dateOfBirth: optional(z.coerce.date()),
    currentOrganization: optional(z.string().trim().max(150)),
    totalExperience: z.coerce.number().min(0).max(50),
    relevantExperience: z.coerce.number().min(0).max(50),
    currentCtc: z.coerce.number().min(0),
    expectedCtc: z.coerce.number().min(0),
    noticePeriodDays: z.coerce.number().int().min(0).max(180),
    preferredLocation: z.string().trim().min(2).max(100),
    source: z.enum(['LINKEDIN', 'NAUKRI', 'REFERRAL', 'CAREER_SITE', 'OTHER']),
    jobId: id,
  })
  .refine((d) => d.relevantExperience <= d.totalExperience, {
    message: 'Relevant experience cannot be more than total experience',
    path: ['relevantExperience'],
  });

const candidateFilterSchema = z.object({
  jobId: optional(id),
  stage: optional(z.enum(STAGES)),
  status: optional(z.enum(Object.values(STATUS))),
  search: optional(z.string().trim().max(100)),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

const panelSchema = z.object({
  fullName: name,
  email,
  mobileCode,
  mobile,
  organization: z.string().trim().min(2).max(150),
  designation: z.string().trim().min(2).max(100),
});

const interviewSchema = z.object({
  round: z.enum(['L1', 'L2']),
  scheduledAt: z.coerce.date().refine((d) => d > new Date(), 'Interview must be in the future'),
  panelIds: z
    .array(id)
    .min(1, 'Select at least 1 panel member')
    .max(2, 'Maximum 2 panel members')
    .refine((ids) => new Set(ids).size === ids.length, 'Same panel member selected twice'),
  focusAreas: z.string().trim().min(3).max(1000),
  // Optional online meeting link. Only https:// links are accepted (blocks javascript: tricks).
  meetingLink: optional(
    z
      .string()
      .trim()
      .max(500)
      .refine((v) => {
        try {
          return new URL(v).protocol === 'https:';
        } catch {
          return false;
        }
      }, 'Paste a full meeting link starting with https://, e.g. https://meet.google.com/abc-defg-hij'),
  ),
});

const feedbackSchema = z.object({
  comments,
  strengths: z.string().trim().min(2).max(1000),
  weaknesses: z.string().trim().min(2).max(1000),
  areasCovered: z.string().trim().min(2).max(1000),
  rating: z.number().int().min(1).max(5),
  result: z.enum(['SELECTED', 'REJECTED']),
});

const commentsSchema = z.object({ comments });
const decisionSchema = z.object({ decision: z.enum(['SELECTED', 'REJECTED']), comments });

module.exports = {
  registerSchema,
  loginSchema,
  setPasswordSchema,
  googleLoginSchema,
  changePasswordSchema,
  jobSchema,
  candidateSchema,
  candidateFilterSchema,
  panelSchema,
  interviewSchema,
  feedbackSchema,
  commentsSchema,
  decisionSchema,
};
