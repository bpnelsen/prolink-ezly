import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { jobService } from '../services/job.service';
import { requireAuth, requireContractor } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(requireAuth, requireContractor);

const jobSchema = z.object({
  client_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  trade: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  address_line1: z.string().optional(),
  city: z.string().optional(),
  state_code: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
  estimated_value: z.number().min(0).optional(),
  contract_url: z.string().url().optional(),
});

const updateJobSchema = jobSchema.partial().extend({
  status: z.enum(['draft', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
  actual_start: z.string().optional(),
  actual_end: z.string().optional(),
  contract_signed: z.boolean().optional(),
});

const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  payment_amount: z.number().min(0).optional(),
  sort_order: z.number().int().optional(),
});

const updateMilestoneSchema = milestoneSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'approved']).optional(),
  completed_date: z.string().optional(),
});

const photoSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  photo_type: z.enum(['before', 'progress', 'after']).optional(),
  taken_at: z.string().optional(),
});

const documentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  document_type: z.string().optional(),
});

// ——— Jobs CRUD ———————————————————————————————————————————————————————————————————

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await jobService.list(req.user!.contractor_id!, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      status: req.query.status as string | undefined,
      client_id: req.query.client_id as string | undefined,
      search: req.query.search as string | undefined,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch jobs' });
  }
});

router.post('/', validate(jobSchema), async (req: Request, res: Response) => {
  try {
    const job = await jobService.create(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: job, message: 'Job created' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create job' });
  }
});

// Ported confirm-visit logic 
router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const job = await jobService.update(req.user!.contractor_id!, req.params.id, {
      status: 'review',
    });
    res.json({ data: job, message: 'Job status updated to review' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to confirm job' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await jobService.getById(req.user!.contractor_id!, req.params.id);
    res.json({ data: job });
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.put('/:id', validate(updateJobSchema), async (req: Request, res: Response) => {
  try {
    const job = await jobService.update(req.user!.contractor_id!, req.params.id, req.body);
    res.json({ data: job, message: 'Job updated' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update job' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await jobService.delete(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete job' });
  }
});

// ——— Milestones ———————————————————————————————————————————————————————————————————

router.get('/:id/milestones', async (req: Request, res: Response) => {
  try {
    const milestones = await jobService.getMilestones(req.user!.contractor_id!, req.params.id);
    res.json({ data: milestones });
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.post('/:id/milestones', validate(milestoneSchema), async (req: Request, res: Response) => {
  try {
    const milestone = await jobService.addMilestone(req.user!.contractor_id!, req.params.id, req.body);
    res.status(201).json({ data: milestone, message: 'Milestone created' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create milestone' });
  }
});

router.put('/:id/milestones/:milestoneId', validate(updateMilestoneSchema), async (req: Request, res: Response) => {
  try {
    const milestone = await jobService.updateMilestone(
      req.user!.contractor_id!,
      req.params.id,
      req.params.milestoneId,
      req.body
    );
    res.json({ data: milestone, message: 'Milestone updated' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update milestone' });
  }
});

router.delete('/:id/milestones/:milestoneId', async (req: Request, res: Response) => {
  try {
    await jobService.deleteMilestone(req.user!.contractor_id!, req.params.id, req.params.milestoneId);
    res.json({ message: 'Milestone deleted' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete milestone' });
  }
});

// ——— Photos —————————————————————————————————————————————————————————————————————

router.post('/:id/photos', validate(photoSchema), async (req: Request, res: Response) => {
  try {
    const photo = await jobService.addPhoto(req.user!.contractor_id!, req.params.id, req.body);
    res.status(201).json({ data: photo, message: 'Photo added' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add photo' });
  }
});

router.get('/:id/photos', async (req: Request, res: Response) => {
  try {
    const photos = await jobService.getPhotos(req.user!.contractor_id!, req.params.id);
    res.json({ data: photos });
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.delete('/:id/photos/:photoId', async (req: Request, res: Response) => {
  try {
    await jobService.deletePhoto(req.user!.contractor_id!, req.params.id, req.params.photoId);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete photo' });
  }
});

// ——— Documents ———————————————————————————————————————————————————————————————————

router.post('/:id/documents', validate(documentSchema), async (req: Request, res: Response) => {
  try {
    const document = await jobService.addDocument(req.user!.contractor_id!, req.params.id, req.body);
    res.status(201).json({ data: document, message: 'Document added' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add document' });
  }
});

router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const documents = await jobService.getDocuments(req.user!.contractor_id!, req.params.id);
    res.json({ data: documents });
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.delete('/:id/documents/:documentId', async (req: Request, res: Response) => {
  try {
    await jobService.deleteDocument(req.user!.contractor_id!, req.params.id, req.params.documentId);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete document' });
  }
});

export default router;
