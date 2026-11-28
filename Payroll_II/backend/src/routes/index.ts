import { Router } from 'express';
import program from './program';
import attendance from './attendance';
import holidays from './holidays';
import depm from './depm';
import noptrn from './noptrn';
import disppays from './disppays';
import { requireActiveAccount, requireEmployee, requireScreen } from '../lib/permissions';
import { requireAuth, wrap } from '../middleware';
import { AuthController } from '../controllers/auth.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { EmployeeController, LookupController } from '../controllers/employee.controller';

const router = Router();

// --- 1. Public Authentication Routes ---
// User login endpoint (does not require auth token)
router.post('/auth/login', wrap(AuthController.login));

// --- 2. Authentication Middleware ---
// Protect all endpoints below with JWT token check
router.use(requireAuth);
router.use(requireActiveAccount);

// --- 3. User & Account Routes ---
router.post('/auth/password', wrap(AuthController.changePassword));
router.get('/auth/me', AuthController.me);

// --- 4. Program Sub-Router ---
router.use('/program', program);
router.use('/attendance', attendance);
router.use('/holidays', holidays);
router.use('/depm', depm);
router.use('/noptrn', noptrn);
router.use('/disppays', disppays);

// --- 5. Dashboard & Master Lookups ---
router.get('/dashboard', requireScreen('dashboard'), wrap(DashboardController.summary));
router.get('/lookups', wrap(LookupController.all));

// --- 6. Employee CRUD Routes ---
// Get paginated employee list
router.get('/employees', requireEmployee('view'), wrap(EmployeeController.list));

// Get all employees (for export, copy, print)
router.get('/employees/all', requireEmployee('view'), wrap(EmployeeController.all));

// Create new employee
router.post('/employees', requireEmployee('add'), wrap(EmployeeController.create));

// Get next available employee number
router.get('/employees/next-number', requireEmployee('add'), wrap(EmployeeController.nextNumber));

// Get employee by ID
router.get('/employees/:id', requireEmployee('view'), wrap(EmployeeController.get));

// Update employee details
router.put('/employees/:id', requireEmployee('amend'), wrap(EmployeeController.update));

// Delete employee
router.delete('/employees/:id', requireEmployee('delete'), wrap(EmployeeController.remove));

export default router;
