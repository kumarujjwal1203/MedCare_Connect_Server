import crypto from "crypto";
import User from "../models/User.model.js";
import AIMemory from "../models/AIMemory.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { OAuth2Client } from "google-auth-library";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { env } from "../config/env.js";

const accessTokenExpiry = "15m";
const refreshTokenExpiry = "7d";

const createAccessToken = (user) =>
  jwt.sign({ id: user._id }, env.jwtSecret, {
    expiresIn: accessTokenExpiry,
  });

const createRefreshToken = (user) =>
  jwt.sign({ id: user._id }, env.jwtRefreshSecret, {
    expiresIn: refreshTokenExpiry,
  });

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

const setRefreshCookie = (res, token) => {
  const isProd = env.nodeEnv === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sendAuthPayload = (res, user, accessToken, refreshToken) => {
  setRefreshCookie(res, refreshToken);
  return res.json({
    token: accessToken,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || "",
      age: user.age,
      gender: user.gender,
      allergies: user.allergies,
      chronicConditions: user.chronicConditions,
    },
  });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, age, gender, allergies, chronicConditions } =
      req.body;

    if (!name || !email || !password || !age || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    if (Number(age) < 13) {
      return res
        .status(400)
        .json({ message: "Users must be 13 or older to register." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      age,
      gender,
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
    });

    await AIMemory.create({ userId: user._id });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    sendAuthPayload(res.status(201), user, accessToken, refreshToken);
  } catch (error) {
    console.error(error.message);

    if (error.code === 11000) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    if (error.name === "ValidationError") {
      const validationMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return res
        .status(400)
        .json({ message: validationMessage || "Invalid user data" });
    }

    res.status(500).json({ message: error.message || "Registration failed" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select(
      "+password +refreshToken",
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    sendAuthPayload(res, user, accessToken, refreshToken);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Login failed" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken ?? req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    const decoded = jwt.verify(token, env.jwtRefreshSecret);
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken: token,
    }).select("+refreshToken");

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshCookie(res, newRefreshToken);
    return res.json({ token: newAccessToken });
  } catch (error) {
    console.error(error.message);
    return res
      .status(401)
      .json({ message: "Refresh token invalid or expired" });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.id) {
          await User.findByIdAndUpdate(decoded.id, { refreshToken: null });
        }
      } catch {
        // ignore decode errors — still clear the cookie
      }
    }

    const isProd = env.nodeEnv === "production";
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });

    return res.json({ message: "Logged out" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Logout failed" });
  }
};

export const googleAuthorize = (req, res) => {
  const authUrl = googleClient.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "profile", "email"],
  });

  return res.redirect(authUrl);
};

export const googleCallback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is required" });
    }

    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email_verified || !payload?.email) {
      return res.status(400).json({ message: "Google account not valid" });
    }

    let user = await User.findOne({ email: payload.email }).select(
      "+refreshToken",
    );

    if (!user) {
      user = await User.create({
        name: payload.name || "Google User",
        email: payload.email,
        password: await bcrypt.hash(
          process.env.GOOGLE_TEMP_PASSWORD || "TempP@ssw0rd",
          10,
        ),
        age: 18,
        gender: "Other",
        googleId: payload.sub,
        allergies: [],
        chronicConditions: [],
      });
      await AIMemory.create({ userId: user._id });
    }

    if (!user.googleId) {
      user.googleId = payload.sub;
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    // Pass access token via URL so the SPA can store it in localStorage
    const clientBase = env.clientUrls[0] || "http://localhost:5173";
    return res.redirect(`${clientBase}/oauth-callback?token=${accessToken}`);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Google OAuth callback failed" });
  }
};

export const googleOAuth = async (req, res) => {
  try {
    const { idToken, firebaseIdToken, firebaseUser } = req.body;
    if (!idToken && !firebaseUser?.email) {
      return res.status(400).json({ message: "Google account information is required" });
    }

    let payload;

    if (process.env.GOOGLE_CLIENT_ID && idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (firebaseUser?.email) {
      payload = {
        sub: firebaseUser.uid || firebaseIdToken || firebaseUser.email,
        name: firebaseUser.name || firebaseUser.email.split("@")[0],
        email: firebaseUser.email,
        picture: firebaseUser.photoURL || "",
        email_verified: firebaseUser.emailVerified !== false,
      };
    }

    if (!payload?.email_verified || !payload?.email) {
      return res.status(400).json({ message: "Google account not valid" });
    }

    let user = await User.findOne({ email: payload.email }).select(
      "+refreshToken",
    );
    if (!user) {
      user = await User.create({
        name: payload.name || "Google User",
        email: payload.email,
        password: await bcrypt.hash(
          process.env.GOOGLE_TEMP_PASSWORD || "TempP@ssw0rd",
          10,
        ),
        age: 18,
        gender: "Other",
        googleId: payload.sub,
        profilePic: payload.picture || "",
        allergies: [],
        chronicConditions: [],
      });
      await AIMemory.create({ userId: user._id });
    }

    if (!user.googleId) {
      user.googleId = payload.sub;
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    sendAuthPayload(res, user, accessToken, refreshToken);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Google OAuth login failed" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshToken",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, age, gender, allergies, chronicConditions } = req.body;

    const updateData = {};
    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (age !== undefined && age !== "") {
      const numericAge = Number(age);
      if (!Number.isFinite(numericAge) || numericAge < 13 || numericAge > 120) {
        return res.status(400).json({ message: "Age must be between 13 and 120." });
      }
      updateData.age = numericAge;
    }
    if (gender !== undefined && gender !== "") {
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({ message: "Invalid gender value." });
      }
      updateData.gender = gender;
    }
    if (Array.isArray(allergies)) updateData.allergies = allergies;
    if (Array.isArray(chronicConditions)) updateData.chronicConditions = chronicConditions;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// ── Forgot Password ──────────────────────────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    // Always respond the same — do not reveal whether email exists
    const genericMsg = "If this email is registered, a reset link has been sent.";

    if (!user) return res.json({ message: genericMsg });

    // Generate a secure random token (expires in 15 minutes)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const clientUrl = env.clientUrls[0] || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail({ toEmail: user.email, userName: user.name, resetUrl });
    } catch (emailErr) {
      console.error("Reset email failed:", emailErr.message);
      // Clear the token so user can try again
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      return res.status(500).json({ message: "Could not send reset email. Check server email config." });
    }

    res.json({ message: genericMsg });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Forgot password request failed" });
  }
};

// ── Reset Password ───────────────────────────────────────────────────────────

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) return res.status(400).json({ message: "Reset token is required" });
    if (!password || password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }, // not expired
    }).select("+resetPasswordToken +resetPasswordExpires +refreshToken");

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.refreshToken = null; // invalidate all existing sessions
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Password reset failed" });
  }
};
