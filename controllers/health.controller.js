import HealthRecord from "../models/HealthRecord.model.js";
import AIMemory from "../models/AIMemory.model.js";
import User from "../models/User.model.js";
import { calculateRisk } from "../services/risk.service.js";

export const getHealthTimeline = async (req, res) => {
  try {
    const records = await HealthRecord.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch timeline" });
  }
};

export const getAIMemory = async (req, res) => {
  try {
    const memory = await AIMemory.findOne({ userId: req.user.id });
    res.json(memory || {
      frequentSymptoms: [],
      pastDiagnoses: [],
      medicationsHistory: [],
      riskPatterns: []
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch AI memory" });
  }
};

export const getRiskScore = async (req, res) => {
  try {
    const [records, user] = await Promise.all([
      HealthRecord.find({ userId: req.user.id }),
      User.findById(req.user.id).select("age gender chronicConditions allergies")
    ]);

    const riskData = calculateRisk(records, user);
    res.json(riskData);
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate risk score" });
  }
};

export const clearAIMemory = async (req, res) => {
  try {
    await AIMemory.findOneAndUpdate(
      { userId: req.user.id },
      { frequentSymptoms: [], pastDiagnoses: [], medicationsHistory: [], riskPatterns: [], lastUpdated: new Date() },
      { upsert: true }
    );
    res.json({ message: "AI memory cleared" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear memory" });
  }
};
