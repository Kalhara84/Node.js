import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { HolidayController as controller } from '../controllers/holiday.controller';

const router = Router();

// Holiday lookup types and date-range grid
router.get('/types', requireScreen('a_holm'), wrap(controller.types));
router.get('/range', requireScreen('a_holm'), wrap(controller.range));

// List all holidays
router.get('/', requireScreen('a_holm'), wrap(controller.list));

// Create, bulk-save, update, and delete holiday records
router.post('/bulk', requireScreen('a_holm', 'add'), wrap(controller.bulkSave));
router.post('/', requireScreen('a_holm', 'add'), wrap(controller.create));
router.put('/:id', requireScreen('a_holm', 'amend'), wrap(controller.update));
router.delete('/:id', requireScreen('a_holm', 'delete'), wrap(controller.remove));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
