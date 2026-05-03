import validator from "validator";
import { env } from "../config/env.js";

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)/gi,
  /(--|#|\/\*|\*\/)/g,
  /(1\s*=\s*1|'\s*=\s*')/gi,
  /(OR|AND)\s+\d+\s*[=<>]/gi
];

const MEDICAL_PROMPT_INJECTION_PATTERNS = [
  /ignore\s*(previous|above|all)\s*(instructions|prompts|rules)/gi,
  /forget\s*(your|previous|the)\s*(instructions|prompts|context)/gi,
  /you\s*are\s*(now|actually)\s*a/gi,
  /pretend\s*(you|to)\s*be/gi,
  /system\s*prompt/gi,
  /override/gi,
  /jailbreak/gi,
  /DAN\s*mode/gi,
  /new\s*(rules|instructions)/gi
];

const sanitizeValue = (value) => {
  if (typeof value === "string") {
    // Strip null bytes and control characters but do NOT HTML-escape —
    // escaping corrupts user messages sent to the AI (e.g. ">" → "&gt;")
    return validator.stripLow(value.trim(), { keep_new_lines: true });
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === "object" && value !== null) {
    const sanitized = {};
    Object.keys(value).forEach(key => {
      sanitized[key] = sanitizeValue(value[key]);
    });
    return sanitized;
  }
  return value;
};

export const sanitizeInput = (req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitized = {};
    Object.keys(req.body).forEach(key => {
      sanitized[key] = sanitizeValue(req.body[key]);
    });
    req.body = sanitized;
  }

  if (req.params && Object.keys(req.params).length > 0) {
    const sanitized = {};
    Object.keys(req.params).forEach(key => {
      sanitized[key] = sanitizeValue(req.params[key]);
    });
    req.params = sanitized;
  }

  next();
};

export const validateMedicalInput = (req, res, next) => {
  const checkForXSS = (value, path) => {
    if (typeof value === "string") {
      XSS_PATTERNS.forEach(pattern => {
        if (pattern.test(value)) {
          throw new Error(`Potential XSS attack detected in ${path}`);
        }
      });
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => checkForXSS(item, `${path}[${i}]`));
    }
    if (typeof value === "object" && value !== null) {
      Object.keys(value).forEach(key => checkForXSS(value[key], `${path}.${key}`));
    }
  };

  const checkForSQLInjection = (value, path) => {
    if (typeof value === "string") {
      SQL_INJECTION_PATTERNS.forEach(pattern => {
        if (pattern.test(value)) {
          throw new Error(`Potential SQL injection detected in ${path}`);
        }
      });
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => checkForSQLInjection(item, `${path}[${i}]`));
    }
  };

  const checkForPromptInjection = (value, path) => {
    if (typeof value === "string") {
      MEDICAL_PROMPT_INJECTION_PATTERNS.forEach(pattern => {
        if (pattern.test(value)) {
          console.warn(`Potential prompt injection detected in ${path}: ${value.substring(0, 50)}`);
        }
      });
    }
  };

  try {
    if (req.body) {
      Object.keys(req.body).forEach(key => {
        checkForXSS(req.body[key], `body.${key}`);
        checkForSQLInjection(req.body[key], `body.${key}`);
        checkForPromptInjection(req.body[key], `body.${key}`);
      });
    }
    next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

export const validateSymptomInput = (req, res, next) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  if (message.length > 2000) {
    return res.status(400).json({ message: "Message too long (max 2000 characters)" });
  }

  if (message.trim().length < 3) {
    return res.status(400).json({ message: "Message too short (min 3 characters)" });
  }

  next();
};

export const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf"
  ];

  const maxFileSize = env.maxFileSize;

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      message: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF"
    });
  }

  if (req.file.size > maxFileSize) {
    return res.status(400).json({
      message: `File too large. Maximum size: ${maxFileSize / 1024 / 1024}MB`
    });
  }

  next();
};
