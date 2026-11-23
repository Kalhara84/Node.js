import { Router } from 'express';
import { wrap } from '../middleware';
import { requireScreen } from '../lib/permissions';
import usrenter from './usrenter';
import { AdministrationController } from '../controllers/administration.controller';

const router = Router();

// Every endpoint below is controlled by the user's rights on the matching program
// (Program Master = a_programs, User Master = a_users, User Rights = usrenter).
// Administrators have all rights.

// --- 1. User rights screen ---
router.use('/usrenter', requireScreen('rights'), usrenter);

// --- 2. Lookup masters (modules, submodules, locations) ---
router.get('/lookups', requireScreen(['programs', 'users']), wrap(AdministrationController.lookups));

// Add new lookup record (module or submodule)
router.post('/lookups', requireScreen('programs', 'add'), wrap(AdministrationController.addLookup));

// --- 3. Program Routes ---
router.get('/programs', requireScreen('programs'), wrap(AdministrationController.programs));

// Create a new program
router.post('/programs', requireScreen('programs', 'add'), wrap(AdministrationController.createProgram));

// Update existing program
router.put('/programs/:id', requireScreen('programs', 'amend'), wrap(AdministrationController.updateProgram));

// Delete program and all assigned user rights
router.delete('/programs/:id', requireScreen('programs', 'delete'), wrap(AdministrationController.deleteProgram));

// --- 4. User Routes ---
router.get('/users', requireScreen('users'), wrap(AdministrationController.users));

// Create new user account
router.post('/users', requireScreen('users', 'add'), wrap(AdministrationController.createUser));

// Update user account details
router.put('/users/:id', requireScreen('users', 'amend'), wrap(AdministrationController.updateUser));

// --- 5. User Rights Routes ---
// Get program rights assigned to a specific user
router.get('/rights/:id', requireScreen('rights'), wrap(AdministrationController.rights));

// Update program rights for a user
router.put('/rights/:id', requireScreen('rights'), wrap(AdministrationController.saveRights));

// --- 6. Error handler (validation errors and unique constraint violations) ---
router.use(AdministrationController.handleError);

export default router;
