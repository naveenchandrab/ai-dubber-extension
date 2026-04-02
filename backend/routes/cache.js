const express = require("express");
const router = express.Router();
const cache = require("../cache/memoryCache");

router.get("/", (req, res) => {
  res.json({
    status: "cache active",
    ...cache.stats(),
  });
});

module.exports = router;
