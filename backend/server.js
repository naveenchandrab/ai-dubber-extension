const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const translateRoute = require("./routes/translate");
const ttsRoute = require("./routes/tts");
const cacheRoute = require("./routes/cache");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/translate", translateRoute);
app.use("/tts", ttsRoute);
app.use("/cache", cacheRoute);

app.get("/", (req, res) => {
  res.json({
    status: "AI Dubber backend running",
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`AI Dubber backend listening on http://localhost:${PORT}`);
});
