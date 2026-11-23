// Connect administrator-only URLs to program, user and rights controllers.
import { Router } from 'express';
import { wrap } from '../middleware';
import usrenter from './usrenter';
import { AdministrationController } from '../controllers/administration.controller';

// Create the router mounted under /api/administration.
const router = Router();

// --- 1. Administrator check ---
// Every endpoint below needs an active account with administrator rights
router.use(wrap(AdministrationController.requireAdmin));

// --- 2. User rights screen ---
// Forward User Rights requests to the nested usrenter router.
router.use('/usrenter', usrenter);

// --- 3. Lookup masters (modules, submodules, locations) ---
router.get('/lookups', wrap(AdministrationController.lookups));

// Add new lookup record (module or submodule)
router.post('/lookups', wrap(AdministrationController.addLookup));

// --- 4. Program Routes ---
router.get('/programs', wrap(AdministrationController.programs));

// Create a new program
router.post('/programs', wrap(AdministrationController.createProgram));

// Update existing program
router.put('/programs/:id', wrap(AdministrationController.updateProgram));

// Delete program and all assigned user rights
router.delete('/programs/:id', wrap(AdministrationController.deleteProgram));

// --- 5. User Routes ---
router.get('/users', wrap(AdministrationController.users));

// Create new user account
router.post('/users', wrap(AdministrationController.createUser));

// Update user account details
router.put('/users/:id', wrap(AdministrationController.updateUser));

// --- 6. User Rights Routes ---
// Get program rights assigned to a specific user
router.get('/rights/:id', wrap(AdministrationController.rights));

// Update program rights for a user
router.put('/rights/:id', wrap(AdministrationController.saveRights));

// --- 7. Error handler (validation errors and unique constraint violations) ---
router.use(AdministrationController.handleError);

export default router;
