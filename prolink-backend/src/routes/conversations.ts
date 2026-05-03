import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { messagingService } from '../services/messaging.service';
import { requireAuth, requireContractor } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth, requireContractor);

const createConversationSchema = z.object({
  client_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  subject: z.string().optional(),
});

const sendMessageSchema = z.object({
  body: z.string().min(1),
  message_type: z.enum(['text', 'image', 'document', 'system']).optional(),
  attachment_url: z.string().url().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const conversations = await messagingService.listConversations(req.user!.contractor_id!);
    res.json({ data: conversations });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch conversations' });
  }
});

router.post('/', validate(createConversationSchema), async (req: Request, res: Response) => {
  try {
    const conversation = await messagingService.createConversation(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: conversation, message: 'Conversation created' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create conversation' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await messagingService.getConversation(req.user!.contractor_id!, req.params.id);
    res.json({ data: conversation });
  } catch (err) {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await messagingService.getMessages(req.user!.contractor_id!, req.params.id);
    res.json({ data: messages });
  } catch (err) {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

router.post('/:id/messages', validate(sendMessageSchema), async (req: Request, res: Response) => {
  try {
    const message = await messagingService.sendMessage(
      req.user!.contractor_id!,
      req.params.id,
      req.user!.id,
      req.body
    );
    res.status(201).json({ data: message, message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send message' });
  }
});

router.put('/:id/messages/:messageId/read', async (req: Request, res: Response) => {
  try {
    const message = await messagingService.markMessageRead(
      req.user!.contractor_id!,
      req.params.id,
      req.params.messageId
    );
    res.json({ data: message, message: 'Message marked as read' });
  } catch (err) {
    res.status(404).json({ error: 'Message not found' });
  }
});

export default router;
