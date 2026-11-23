// Connect /api URLs to controllers and apply login and permission checks.
import { Router } from 'express';
import administration from './administration';
import { requireActiveAccount, requireEmployee } from '../lib/permissions';
import { requireAuth, wrap } from '../middleware';
import { AuthController } from '../controllers/auth.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { EmployeeController, LookupController } from '../controllers/employee.controller';

const router = Router();

// --- 1. Public Authentication Routes ---
// User login endpoint (does not require auth token)
router.post('/auth/login', wrap(AuthController.login));

// --- 2. Authentication Middleware ---
// All routes below require a valid signed login token.
router.use(requireAuth);
// Confirm that the account still exists and load its current permissions.
router.use(requireActiveAccount);

// --- 3. User & Account Routes ---
// Use the confirmed signed-in user when changing a password.
router.post('/auth/password', wrap(AuthController.changePassword));
// Return the confirmed profile when the frontend refreshes its session.
router.get('/auth/me', AuthController.me);

// --- 4. Administration Sub-Router ---
router.use('/administration', administration);

// --- 5. Dashboard & Master Lookups ---
// Require employee-view permission before loading the dashboard summary.
router.get('/dashboard', requireEmployee('view'), wrap(DashboardController.summary));
router.get('/lookups', wrap(LookupController.all));

// --- 6. Employee CRUD Routes ---
// Get paginated employee list
router.get('/employees', requireEmployee('view'), wrap(EmployeeController.list));

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
