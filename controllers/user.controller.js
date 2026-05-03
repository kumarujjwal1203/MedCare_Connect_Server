import fs from "fs/promises";
import User from "../models/User.model.js";

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshToken -googleId",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Unable to fetch profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, age, gender, allergies, chronicConditions } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required." });
    }

    const updateData = {
      name: String(name).trim(),
    };

    if (email) {
      const nextEmail = String(email).toLowerCase().trim();
      const existingUser = await User.findOne({
        email: nextEmail,
        _id: { $ne: req.user.id },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already in use." });
      }

      updateData.email = nextEmail;
    }

    if (age !== undefined && age !== "") {
      const numericAge = Number(age);
      if (!Number.isFinite(numericAge) || numericAge < 13 || numericAge > 120) {
        return res.status(400).json({ message: "Age must be between 13 and 120." });
      }
      updateData.age = numericAge;
    }

    if (gender) {
      if (!["Male", "Female", "Other"].includes(gender)) {
        return res.status(400).json({ message: "Invalid gender value." });
      }
      updateData.gender = gender;
    }

    if (Array.isArray(allergies)) updateData.allergies = allergies;
    if (Array.isArray(chronicConditions)) updateData.chronicConditions = chronicConditions;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true },
    ).select("-password -refreshToken -googleId");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Unable to update profile" });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  let filePath = "";

  try {
    if (!req.file) {
      return res.status(400).json({ message: "Profile photo is required." });
    }

    filePath = req.file.path;

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files can be used as a profile photo." });
    }

    const fileBuffer = await fs.readFile(filePath);
    const profilePic = `data:${req.file.mimetype};base64,${fileBuffer.toString("base64")}`;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic },
      { new: true, runValidators: true },
    ).select("-password -refreshToken -googleId");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(updatedUser);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Unable to upload profile photo" });
  } finally {
    if (filePath) {
      fs.unlink(filePath).catch(() => {});
    }
  }
};
