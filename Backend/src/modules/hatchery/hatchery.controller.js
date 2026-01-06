import axios from 'axios';

// 1. Get Stats (Node asks Python for data)
export const getTankStats = async (req, res) => {
    const { tankId } = req.params;
    try {
        // Node fetches data from the Python worker (Port 5001)
        const response = await axios.get(`http://localhost:5001/data/${tankId}`);
        
        // Node sends it to the Frontend
        res.json({
            source: "NodeJS Backend",
            ai_data: response.data
        });
    } catch (error) {
        console.error("AI Worker is offline");
        // Return a safe fallback so the frontend doesn't crash
        res.status(503).json({ 
            status: "Offline", 
            species: "Unknown", 
            health: "Unknown" 
        });
    }
};