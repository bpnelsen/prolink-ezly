import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth);

const chatSchema = z.object({
  prompt: z.string().min(1),
});

router.post('/foreman', validate(chatSchema), async (req: Request, res: Response) => {
  try {
    const response = await aiService.chatWithForeman(req.body.prompt);
    res.json({ response });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Foreman internal error';
    res.status(500).json({ response: `Foreman error: ${message}` });
  }
});

export default router;
