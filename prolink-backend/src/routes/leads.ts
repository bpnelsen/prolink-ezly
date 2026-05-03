import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { leadService } from '../services/lead.service';
import { requireAuth, requireContractor } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth, requireContractor);

const leadSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  trade_needed: z.string().optional(),
  project_description: z.string().optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state_code: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  estimated_budget: z.number().min(0).optional(),
  source: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

const updateLeadSchema = leadSchema.extend({
  status: z.enum(['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost']).optional(),
});

const activitySchema = z.object({
  activity_type: z.string().min(1),
  description: z.string().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await leadService.list(req.user!.contractor_id!, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status: req.query.status as string | undefined,
      priority: req.query.priority as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch leads';
    res.status(500).json({ error: message });
  }
});

router.post('/', validate(leadSchema), async (req: Request, res: Response) => {
  try {
    const lead = await leadService.create(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: lead, message: 'Lead created' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create lead';
    res.status(500).json({ error: message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const lead = await leadService.getById(req.user!.contractor_id!, req.params.id);
    res.json({ data: lead });
  } catch (err) {
    res.status(404).json({ error: 'Lead not found' });
  }
});

router.put('/:id', validate(updateLeadSchema), async (req: Request, res: Response) => {
  try {
    const lead = await leadService.update(req.user!.contractor_id!, req.params.id, req.body);
    res.json({ data: lead, message: 'Lead updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update lead';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await leadService.delete(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete lead';
    res.status(500).json({ error: message });
  }
});

router.post('/:id/activity', validate(activitySchema), async (req: Request, res: Response) => {
  try {
    const activity = await leadService.addActivity(req.user!.contractor_id!, req.params.id, req.body);
    res.status(201).json({ data: activity, message: 'Activity logged' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to log activity';
    res.status(500).json({ error: message });
  }
});

router.get('/:id/activity', async (req: Request, res: Response) => {
  try {
    const activity = await leadService.getActivity(req.user!.contractor_id!, req.params.id);
    res.json({ data: activity });
  } catch (err) {
    res.status(404).json({ error: 'Lead not found' });
  }
});

router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const result = await leadService.convert(req.user!.contractor_id!, req.params.id);
    res.status(201).json({ data: result, message: 'Lead converted to client' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to convert lead';
    res.status(400).json({ error: message });
  }
});

export default router;
