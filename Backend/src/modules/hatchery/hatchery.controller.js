import axios from "axios";

export const getTankStats = async (req, res) => {
  const { tankId } = req.params;
  const response = await axios.get(`http://localhost:5001/data/${tankId}`);
  res.json(response.data);
};

export const getAlerts = async (req, res) => {
  try {
  
    const response = await axios.get("http://localhost:5001/alerts");
    res.json(response.data);
  } catch (error) {
    console.error("Error connecting to Python AI service:", error.message);
    res.json([]);
  }
};
