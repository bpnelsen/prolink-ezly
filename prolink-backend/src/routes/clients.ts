import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { clientService } from '../services/client.service';
import { validate } from '../middleware/validate';
import { requireAuth, requireContractor } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireContractor);

const clientSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_code: z.string().length(2).optional(),
  zip_code: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const noteSchema = z.object({ note: z.string().min(1) });

router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await clientService.list(req.user!.contractor_id!, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      search: req.query.search as string | undefined,
      state_code: req.query.state_code as string | undefined,
      source: req.query.source as string | undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

router.post('/', validate(clientSchema), async (req: Request, res: Response) => {
  try {
    console.log('Creating client for contractor:', req.user?.contractor_id);
    const client = await clientService.create(req.user!.contractor_id!, req.body);
    res.status(201).json({ data: client, message: 'Client created' });
  } catch (err) {
    console.error('Creation error details:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create client' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const client = await clientService.getById(req.user!.contractor_id!, req.params.id);
    res.json({ data: client });
  } catch (err) {
    res.status(404).json({ error: 'Client not found' });
  }
});

router.put('/:id', validate(clientSchema.partial()), async (req: Request, res: Response) => {
  try {
    const client = await clientService.update(req.user!.contractor_id!, req.params.id, req.body);
    res.json({ data: client, message: 'Client updated' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update client' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await clientService.delete(req.user!.contractor_id!, req.params.id);
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete client' });
  }
});

router.post('/:id/notes', validate(noteSchema), async (req: Request, res: Response) => {
  try {
    const note = await clientService.addNote(req.user!.contractor_id!, req.params.id, req.body.note);
    res.status(201).json({ data: note, message: 'Note added' });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to add note' });
  }
});

router.get('/:id/notes', async (req: Request, res: Response) => {
  try {
    const notes = await clientService.getNotes(req.user!.contractor_id!, req.params.id);
    res.json({ data: notes });
  } catch (err) {
    res.status(404).json({ error: 'Client not found' });
  }
});

export default router;
