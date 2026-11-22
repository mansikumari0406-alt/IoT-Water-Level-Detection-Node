
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const TANK_HEIGHT = 2000;

app.use(express.static(path.join(__dirname, "public")));

let readings = [];

function generateReading() {
    const distance = Math.floor(500 + Math.random() * 1000);
    const waterLevel = TANK_HEIGHT - distance;

    const reading = {
        distance_mm: distance,
        water_level_mm: waterLevel,
        percentage: Math.round((waterLevel / TANK_HEIGHT) * 100),
        sensor: "A121 Simulator",
        status: "Connected (Simulation)",
        timestamp: new Date().toLocaleTimeString()
    };

    readings.push(reading);

    if (readings.length > 30) {
        readings.shift();
    }

    return reading;
}

app.get("/api/reading", (req, res) => {
    res.json(generateReading());
});

app.get("/api/history", (req, res) => {
    res.json(readings);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`A121 Monitor running on port ${PORT}`);
});
