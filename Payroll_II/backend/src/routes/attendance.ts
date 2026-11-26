import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { AttendanceController as controller } from '../controllers/attendance.controller';

const router = Router();

// Active employees for attendance selection
router.get('/employees', requireScreen('a_inqempatt'), wrap(controller.employees));

// List monthly attendance records for an employee
router.get('/', requireScreen('a_inqempatt'), wrap(controller.list));

// Create, update, and delete attendance records
router.post('/', requireScreen('a_inqempatt', 'add'), wrap(controller.create));
router.put('/:id', requireScreen('a_inqempatt', 'amend'), wrap(controller.update));
router.delete('/:id', requireScreen('a_inqempatt', 'delete'), wrap(controller.remove));

// Controller-specific error handler
router.use(controller.handleError);

export default router;
