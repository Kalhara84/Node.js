import { Router } from 'express';
import { requireAuth, wrap } from '../middleware';
import { AuthController } from '../controllers/auth.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { EmployeeController, LookupController } from '../controllers/employee.controller';

const router = Router();

// public
router.post('/auth/login', wrap(AuthController.login));

// everything below needs a valid token
router.use(requireAuth);
router.get('/auth/me', AuthController.me);
router.get('/dashboard', wrap(DashboardController.summary));
router.get('/lookups', wrap(LookupController.all));

router.get('/employees', wrap(EmployeeController.list));
router.post('/employees', wrap(EmployeeController.create));
router.get('/employees/:id', wrap(EmployeeController.get));
router.put('/employees/:id', wrap(EmployeeController.update));
router.delete('/employees/:id', wrap(EmployeeController.remove));
export default router;
