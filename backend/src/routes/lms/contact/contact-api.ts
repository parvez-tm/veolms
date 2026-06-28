import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../helpers/async-handler';
import { authLimiter } from '../../../middleware/rate-limit-middleware';
import { ApiError } from '../../../types/interface';
import { sendContactMessage } from '../../../services/email-service';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Accept a public contact-form submission and forward it (email or dev console). */
const submitContact = async (req: Request, res: Response): Promise<void> => {
  const { name, email, subject, message } = req.body ?? {};
  if (!name || !email || !subject || !message) {
    throw new ApiError(400, 'All fields are required');
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    throw new ApiError(400, 'A valid email address is required');
  }
  for (const [field, value] of Object.entries({ name, subject, message })) {
    if (typeof value !== 'string' || value.length > 5000) {
      throw new ApiError(400, `Invalid ${field}`);
    }
  }

  await sendContactMessage({
    name: String(name).slice(0, 200),
    email,
    subject: String(subject).slice(0, 300),
    message: String(message).slice(0, 5000),
  });
  res
    .status(200)
    .json({ message: 'Thanks for reaching out! We will get back to you shortly.' });
};

// Rate-limited to deter spam (shared auth limiter is fine for the challenge).
router.post('/', authLimiter, asyncHandler(submitContact));

export default router;
