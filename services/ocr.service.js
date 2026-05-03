import Tesseract from "tesseract.js";
import fs from "fs";
import path from "path";
import { askGemini } from "./gemini.service.js";

// ── PDF text extraction using pdf-parse v2 ────────────────────────────────────
async function extractTextFromPDF(filePath) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || "";
  } catch (err) {
    console.error("[PDF] Extraction failed:", err.message);
    throw new Error("Failed to extract text from PDF. The file may be scanned or encrypted.");
  }
}

// ── Image text extraction using Tesseract OCR ─────────────────────────────────
async function extractTextFromImage(filePath) {
  try {
    const result = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          process.stdout.write(`\r[OCR] ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    process.stdout.write("\n");
    return result.data.text || "";
  } catch (err) {
    console.error("[OCR] Image extraction failed:", err.message);
    throw new Error("Failed to extract text from image.");
  }
}

const emptyAnalysis = () => ({
  patientInfo: { name: null, age: null, gender: null, date: null },
  doctorInfo: { name: null, specialization: null, hospital: null },
  diagnosis: "Medical document parsed from extracted text",
  symptoms: [],
  medicines: [],
  labResults: [],
  instructions: [],
  warnings: [],
  followUp: null,
  summary: "The document text was extracted and parsed locally. Review the extracted fields against the original document before taking medical action.",
});

const normalizeAnalysis = (analysis, rawText = "") => {
  const fallback = buildLocalMedicalAnalysis(rawText);
  const next = {
    ...emptyAnalysis(),
    ...fallback,
    ...(analysis && typeof analysis === "object" ? analysis : {}),
  };

  next.patientInfo = { ...emptyAnalysis().patientInfo, ...fallback.patientInfo, ...(analysis?.patientInfo || {}) };
  next.doctorInfo = { ...emptyAnalysis().doctorInfo, ...fallback.doctorInfo, ...(analysis?.doctorInfo || {}) };
  next.symptoms = Array.isArray(next.symptoms) ? next.symptoms.filter(Boolean) : [];
  next.medicines = Array.isArray(next.medicines) ? next.medicines.filter((m) => m?.name) : [];
  next.labResults = Array.isArray(next.labResults) ? next.labResults.filter((r) => r?.test && r?.value) : [];
  next.instructions = Array.isArray(next.instructions) ? next.instructions.filter(Boolean) : [];
  next.warnings = Array.isArray(next.warnings) ? next.warnings.filter(Boolean) : [];
  next.diagnosis = next.diagnosis || fallback.diagnosis || "Medical document parsed from extracted text";
  next.summary = next.summary || fallback.summary;

  return next;
};

const parseJsonObject = (text) => {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("No valid JSON object found in AI response");
  }
};

const unique = (items) => [...new Set(items.map((item) => item.trim()).filter(Boolean))];

const buildLocalMedicalAnalysis = (rawText = "") => {
  const analysis = emptyAnalysis();
  const text = rawText.replace(/\r/g, "\n");
  const compact = text.replace(/[ \t]+/g, " ");
  const lines = unique(
    text
      .split(/\n+/)
      .map((line) => line.replace(/\s{2,}/g, " ").trim())
      .filter((line) => line.length >= 2)
  );

  analysis.patientInfo = extractPatientInfo(compact, lines);
  analysis.doctorInfo = extractDoctorInfo(compact, lines);
  analysis.symptoms = extractSymptoms(compact);
  analysis.medicines = extractMedicines(lines);
  analysis.labResults = extractLabResults(lines);
  analysis.instructions = extractInstructions(lines);
  analysis.warnings = extractWarnings(lines);
  analysis.followUp = extractFollowUp(lines);
  analysis.diagnosis = extractDiagnosis(lines, analysis);
  analysis.summary = buildLocalSummary(analysis);

  return analysis;
};

const extractPatientInfo = (text, lines) => {
  const nameMatch =
    text.match(/\b(?:patient|name|pt\.?)\s*[:\-]\s*([A-Z][A-Za-z .]{2,60})/i) ||
    text.match(/\b(?:mr|mrs|ms|miss)\.?\s+([A-Z][A-Za-z .]{2,60})/i);
  const ageMatch = text.match(/\b(?:age|yrs?|years?)\s*[:\-]?\s*(\d{1,3})\b/i) || text.match(/\b(\d{1,3})\s*(?:y\/o|years?|yrs?)\b/i);
  const genderMatch = text.match(/\b(?:gender|sex)\s*[:\-]\s*(male|female|other|m|f)\b/i);
  const dateMatch =
    text.match(/\b(?:date|dated|report date|collection date)\s*[:\-]\s*([0-3]?\d[\/\-.][01]?\d[\/\-.](?:\d{2}|\d{4}))\b/i) ||
    text.match(/\b([0-3]?\d[\/\-.][01]?\d[\/\-.](?:\d{2}|\d{4}))\b/);

  return {
    name: nameMatch?.[1]?.trim() || null,
    age: ageMatch?.[1] || null,
    gender: normalizeGender(genderMatch?.[1]) || null,
    date: dateMatch?.[1] || null,
  };
};

const normalizeGender = (value) => {
  if (!value) return null;
  if (/^m(?:ale)?$/i.test(value)) return "Male";
  if (/^f(?:emale)?$/i.test(value)) return "Female";
  return value;
};

const extractDoctorInfo = (text, lines) => {
  const doctorLine = lines.find((line) => /\b(dr\.?|doctor|consultant|physician)\b/i.test(line));
  const doctorMatch = doctorLine?.match(/\b(?:dr\.?|doctor)\s*([A-Z][A-Za-z .]{2,60})/i);
  const specializationMatch = text.match(/\b(cardiologist|dermatologist|neurologist|orthopedic|paediatrician|pediatrician|gynecologist|general physician|dentist|ent specialist|radiologist|pathologist)\b/i);
  const hospitalLine = lines.find((line) => /\b(hospital|clinic|diagnostic|laborator(?:y|ies)|pathology|medical centre|healthcare)\b/i.test(line));

  return {
    name: doctorMatch?.[1]?.trim() || null,
    specialization: specializationMatch?.[1] || null,
    hospital: hospitalLine || null,
  };
};

const extractDiagnosis = (lines, analysis) => {
  const diagnosisLine = lines.find((line) =>
    /\b(diagnosis|impression|assessment|clinical history|provisional diagnosis)\b\s*[:\-]/i.test(line)
  );

  const value = diagnosisLine?.replace(/^.*?\b(?:diagnosis|impression|assessment|clinical history|provisional diagnosis)\b\s*[:\-]\s*/i, "").trim();
  if (value && value.length > 2) {
    return value.slice(0, 180);
  }

  if (analysis.labResults.length > 0) {
    return "Lab report parsed from extracted text";
  }

  if (analysis.medicines.length > 0) {
    return "Prescription parsed from extracted text";
  }

  return "Medical document parsed from extracted text";
};

const symptomKeywords = [
  "fever", "headache", "cough", "cold", "pain", "chest pain", "vomiting", "nausea",
  "dizziness", "fatigue", "weakness", "rash", "itching", "breathlessness", "sore throat",
  "diarrhea", "constipation", "swelling", "body ache", "abdominal pain"
];

const extractSymptoms = (text) =>
  symptomKeywords.filter((symptom) => new RegExp(`\\b${symptom.replace(/\s+/g, "\\s+")}\\b`, "i").test(text));

const medicinePrefixes = "(?:tab|tablet|cap|capsule|syp|syrup|inj|injection|drops?|ointment|cream|gel|sol|solution)";
const directionPattern = "\\b(?:od|bd|bid|tds|tid|qid|hs|sos|stat|daily|twice|thrice|morning|night|after food|before food)\\b";

const extractMedicines = (lines) => {
  const meds = [];

  for (const line of lines) {
    const hasMedicineHint =
      new RegExp(`\\b${medicinePrefixes}\\b`, "i").test(line) ||
      /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/i.test(line) ||
      new RegExp(directionPattern, "i").test(line);

    if (!hasMedicineHint || /\b(?:range|normal|result|report|sample|patient|doctor)\b/i.test(line)) {
      continue;
    }

    const prefixMatch = line.match(new RegExp(`\\b${medicinePrefixes}\\.?\\s*[:\\-]?\\s*([A-Za-z][A-Za-z0-9 +\\-/().]{2,80})`, "i"));
    const doseMatch = line.match(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/i);
    const durationMatch = line.match(/\b(?:for\s*)?(\d+\s*(?:days?|weeks?|months?))\b/i);
    const frequencyMatch = line.match(new RegExp(directionPattern, "i"));
    const nameSource = prefixMatch?.[1] || line;
    const name = nameSource
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%)\b/gi, "")
      .replace(new RegExp(directionPattern, "gi"), "")
      .replace(/\b(?:for\s*)?\d+\s*(?:days?|weeks?|months?)\b/gi, "")
      .replace(/[-:;,.]+$/g, "")
      .trim()
      .slice(0, 80);

    if (name.length >= 3) {
      meds.push({
        name,
        dosage: doseMatch?.[0] || null,
        frequency: frequencyMatch?.[0] || null,
        duration: durationMatch?.[1] || null,
        instructions: /after food|before food|empty stomach|with food/i.exec(line)?.[0] || null,
      });
    }
  }

  const seen = new Set();
  return meds.filter((med) => {
    const key = `${med.name.toLowerCase()}|${med.dosage || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
};

const labTestNames = [
  "hemoglobin", "hb", "wbc", "rbc", "platelet", "glucose", "cholesterol", "hdl", "ldl",
  "triglycerides", "creatinine", "urea", "bilirubin", "sgpt", "sgot", "alt", "ast",
  "tsh", "t3", "t4", "vitamin d", "b12", "crp", "esr", "hba1c", "sodium", "potassium"
];

const extractLabResults = (lines) => {
  const results = [];

  for (const line of lines) {
    if (!labTestNames.some((test) => new RegExp(`\\b${test.replace(/\s+/g, "\\s+")}\\b`, "i").test(line))) {
      continue;
    }

    const valueMatch = line.match(/([-+]?\d+(?:\.\d+)?)\s*([a-zA-Z/%µ]+(?:\/[a-zA-Z]+)?|mmol\/L|mg\/dL|g\/dL)?/);
    if (!valueMatch) continue;

    const rangeMatch = line.match(/(?:range|normal|ref(?:erence)?\.?)?\s*[:\-]?\s*(\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?\s*[a-zA-Z/%µ]*(?:\/[a-zA-Z]+)?)/i);
    const testName = line
      .replace(/[-:]?\s*[-+]?\d+(?:\.\d+)?.*$/, "")
      .replace(/\b(result|value|normal|range|reference)\b/gi, "")
      .trim();

    results.push({
      test: testName || line.split(/\s+/).slice(0, 3).join(" "),
      value: `${valueMatch[1]}${valueMatch[2] ? ` ${valueMatch[2]}` : ""}`,
      normalRange: rangeMatch?.[1] || null,
      status: /\b(high|low|abnormal|positive|detected)\b/i.test(line)
        ? "abnormal"
        : /\b(borderline)\b/i.test(line)
          ? "borderline"
          : "normal",
    });
  }

  return results.slice(0, 30);
};

const extractInstructions = (lines) =>
  lines
    .filter((line) => /\b(rest|drink|avoid|take|continue|stop|diet|exercise|after food|before food|empty stomach)\b/i.test(line))
    .filter((line) => !new RegExp(`\\b${medicinePrefixes}\\b`, "i").test(line))
    .slice(0, 10);

const extractWarnings = (lines) =>
  lines
    .filter((line) => /\b(warning|caution|allergy|emergency|urgent|do not|avoid|contraindication)\b/i.test(line))
    .slice(0, 8);

const extractFollowUp = (lines) => {
  const follow = lines.find((line) => /\b(follow\s*up|review|revisit|next visit)\b/i.test(line));
  return follow || null;
};

const buildLocalSummary = (analysis) => {
  const parts = [];
  if (analysis.patientInfo.name) parts.push(`Patient: ${analysis.patientInfo.name}.`);
  if (analysis.diagnosis) parts.push(`Document type: ${analysis.diagnosis}.`);
  if (analysis.medicines.length) parts.push(`${analysis.medicines.length} medicine(s) were identified.`);
  if (analysis.labResults.length) parts.push(`${analysis.labResults.length} lab result(s) were identified.`);
  if (!parts.length) parts.push("The document text was extracted successfully and basic medical fields were parsed locally.");
  parts.push("Please verify all extracted details against the original document.");
  return parts.join(" ");
};

// ── Gemini AI analysis of extracted text ─────────────────────────────────────
async function analyzeWithGemini(rawText, isPDF) {
  if (!rawText || rawText.trim().length < 20) {
    throw new Error("Extracted text is too short or empty to analyze.");
  }

  const fileTypeLabel = isPDF ? "PDF medical report/prescription" : "scanned prescription image";

  const prompt = `You are an expert medical prescription and lab report analyzer.

Analyze the following text extracted from a ${fileTypeLabel} and extract all important medical information.

Return ONLY a valid JSON object (no markdown, no extra text) with this exact structure:
{
  "patientInfo": {
    "name": "patient name or null",
    "age": "age or null",
    "gender": "gender or null",
    "date": "date of prescription/report or null"
  },
  "doctorInfo": {
    "name": "doctor name or null",
    "specialization": "specialization or null",
    "hospital": "hospital/clinic name or null"
  },
  "diagnosis": "primary diagnosis as a clear sentence, or 'Not specified'",
  "symptoms": ["list", "of", "symptoms", "mentioned"],
  "medicines": [
    {
      "name": "medicine name",
      "dosage": "dosage strength e.g. 500mg",
      "frequency": "how often e.g. twice daily",
      "duration": "how long e.g. 5 days",
      "instructions": "special instructions e.g. take after meals or null"
    }
  ],
  "labResults": [
    {
      "test": "test name",
      "value": "result value",
      "normalRange": "normal range if mentioned or null",
      "status": "normal or abnormal or borderline"
    }
  ],
  "instructions": ["general instructions from the doctor"],
  "warnings": ["important warnings or precautions"],
  "followUp": "follow-up instructions or date if mentioned, or null",
  "summary": "2-3 sentence plain-language summary of this document for the patient"
}

Rules:
- Use null for missing string fields, [] for missing array fields
- Do NOT invent data not present in the text
- For medicines, extract every drug mentioned even if details are partial
- For lab results, only include if actual test values are present

Text to analyze:
"""
${rawText.slice(0, 6000)}
"""`;

  try {
    const response = await askGemini(prompt);
    return normalizeAnalysis(parseJsonObject(response), rawText);
  } catch (parseErr) {
    console.warn("[Report] AI structuring unavailable, using local parser:", parseErr.message);
    return buildLocalMedicalAnalysis(rawText);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export const processPrescription = async (filePath, mimeType = "") => {
  const isPDF =
    mimeType === "application/pdf" ||
    path.extname(filePath).toLowerCase() === ".pdf";

  let rawText = "";

  if (isPDF) {
    console.log("[Report] Extracting text from PDF...");
    rawText = await extractTextFromPDF(filePath);
  } else {
    console.log("[Report] Running OCR on image...");
    rawText = await extractTextFromImage(filePath);
  }

  if (!rawText || rawText.trim().length < 10) {
    throw new Error(
      isPDF
        ? "The PDF appears to be a scanned image (no selectable text). Try uploading as a JPEG/PNG instead."
        : "Could not extract readable text from the image. Ensure the image is clear and well-lit."
    );
  }

  console.log(`[Report] Extracted ${rawText.length} chars. Sending to Gemini AI...`);

  const analysis = await analyzeWithGemini(rawText, isPDF);

  // Flatten medicines to HealthRecord schema shape
  const medicines = (analysis.medicines || []).map((m) => ({
    name: m.name || "Unknown",
    dosage: [m.dosage, m.frequency].filter(Boolean).join(" — ") || "As prescribed",
    duration: m.duration || "As prescribed",
  }));

  return {
    diagnosis: analysis.diagnosis || "Pending review",
    symptoms: analysis.symptoms || [],
    medicines,
    rawText,
    analysis,
    processed: true,
  };
};
