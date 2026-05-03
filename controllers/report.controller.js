import HealthRecord from "../models/HealthRecord.model.js";
import { processPrescription } from "../services/ocr.service.js";
import fs from "fs";

export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    let extractedData = {
      diagnosis: "Pending review",
      symptoms: [],
      medicines: [],
      rawText: "",
      analysis: null,
      processed: false,
    };

    try {
      extractedData = await processPrescription(filePath, mimeType);
    } catch (ocrError) {
      console.warn("[Report] Processing failed, saving with pending status:", ocrError.message);
      extractedData.error = ocrError.message;
    }

    const healthRecord = await HealthRecord.create({
      userId: req.user.id,
      source: "prescription",
      diagnosis: extractedData.diagnosis,
      symptoms: extractedData.symptoms || [],
      medicines: extractedData.medicines,
      reportDate: new Date(),
    });

    // Clean up uploaded file after processing
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(201).json({
      message: "Report uploaded and analyzed",
      report: healthRecord,
      ocrResult: {
        diagnosis: extractedData.diagnosis,
        medicines: extractedData.medicines,
        symptoms: extractedData.symptoms || [],
        analysis: extractedData.analysis || null,
        processed: extractedData.processed,
        error: extractedData.error || null,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload report: " + error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await HealthRecord.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

export const getReportById = async (req, res) => {
  try {
    const report = await HealthRecord.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch report" });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const report = await HealthRecord.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    res.json({ message: "Report deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete report" });
  }
};
