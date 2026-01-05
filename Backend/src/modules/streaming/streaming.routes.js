import express from 'express';
import { streamingController } from './streaming.controller.js';
import { streamingService } from './streaming.service.js';

const router = express.Router();

// Route to get status/list of streams
router.get('/', streamingController.getStatus);

// We also need to expose the static files. 
// In a modular monolith, ideally the module exposes its assets or the main app does.
// Since the frontend expects /streams directly, we'll handle the static serve in the main app 
// or mount it here. 
// However, serving static files is usually done by express.static(). 
// We can export a function to setup the static mw or just let the main app handle global static dirs.
// For modularity, let's export the Service so the App can start it, and the Router for API.

export default router;
