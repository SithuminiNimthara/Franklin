import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Turtles module ready' });
});

export default router;
