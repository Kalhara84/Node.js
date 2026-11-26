import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import { AttendanceController as controller } from '../controllers/attendance.controller';

const router = Router();
router.get('/employees', requireScreen('a_inqempatt'), wrap(controller.employees));
router.get('/', requireScreen('a_inqempatt'), wrap(controller.list));
router.post('/', requireScreen('a_inqempatt', 'add'), wrap(controller.create));
router.put('/:id', requireScreen('a_inqempatt', 'amend'), wrap(controller.update));
router.delete('/:id', requireScreen('a_inqempatt', 'delete'), wrap(controller.remove));
router.use(controller.handleError);
export default router;
