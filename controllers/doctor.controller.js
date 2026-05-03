import Doctor from "../models/Doctor.model.js";
import { recommendDoctorBySymptoms } from "../services/recommend.service.js";

export const getDoctors = async (req, res) => {
  try {
    const { specialization, city, available, search, page = 1, limit = 10 } = req.query;

    const query = { isActive: true };

    if (specialization) {
      query.specialization = new RegExp(specialization, "i");
    }

    if (city) {
      query["location.city"] = new RegExp(city, "i");
    }

    if (available === "true") {
      query.availability = true;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { specialization: new RegExp(search, "i") },
        { hospital: new RegExp(search, "i") }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [doctors, total] = await Promise.all([
      Doctor.find(query)
        .sort({ "rating.average": -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Doctor.countDocuments(query)
    ]);

    res.json({
      doctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch doctors" });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch doctor" });
  }
};

export const createDoctor = async (req, res) => {
  try {
    const {
      name, specialization, hospital, location, contact,
      qualifications, experience, consultationHours, fees
    } = req.body;

    if (!name || !specialization) {
      return res.status(400).json({ message: "Name and specialization are required" });
    }

    const doctor = await Doctor.create({
      name, specialization, hospital, location, contact,
      qualifications, experience, consultationHours, fees
    });

    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Failed to create doctor" });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const {
      name, specialization, hospital, location, contact,
      qualifications, experience, availability, consultationHours,
      fees, isActive
    } = req.body;

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(specialization && { specialization }),
        ...(hospital !== undefined && { hospital }),
        ...(location && { location }),
        ...(contact && { contact }),
        ...(qualifications && { qualifications }),
        ...(experience && { experience }),
        ...(availability !== undefined && { availability }),
        ...(consultationHours && { consultationHours }),
        ...(fees && { fees }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Failed to update doctor" });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json({ message: "Doctor deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete doctor" });
  }
};

export const getSpecializations = async (req, res) => {
  try {
    const specializations = await Doctor.distinct("specialization", { isActive: true });
    res.json(specializations.sort());
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch specializations" });
  }
};

export const recommendDoctor = async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({ message: "Symptoms are required" });
    }

    const recommendedSpecialization = recommendDoctorBySymptoms(symptoms);

    const doctors = await Doctor.find({
      specialization: new RegExp(recommendedSpecialization.specialization, "i"),
      availability: true,
      isActive: true
    }).limit(5);

    res.json({
      recommended: recommendedSpecialization,
      doctors
    });
  } catch (error) {
    console.error("recommendDoctor error:", error.message);
    res.status(500).json({ message: "Failed to recommend doctor" });
  }
};

export const seedDoctors = async (req, res) => {
  try {
    const doctors = [
      {
        name: "Dr. Rajesh Kumar",
        specialization: "Cardiologist",
        hospital: "Apollo Hospital",
        location: { city: "Delhi", state: "Delhi" },
        qualifications: ["MD", "DM"],
        experience: { years: 15, description: "Expert in interventional cardiology" },
        fees: { initial: 1000, followUp: 500 },
        availability: true
      },
      {
        name: "Dr. Priya Sharma",
        specialization: "Dermatologist",
        hospital: "Fortis Hospital",
        location: { city: "Mumbai", state: "Maharashtra" },
        qualifications: ["MD", "DVD"],
        experience: { years: 10, description: "Specializes in cosmetic dermatology" },
        fees: { initial: 800, followUp: 400 },
        availability: true
      },
      {
        name: "Dr. Amit Patel",
        specialization: "Orthopedic",
        hospital: "Manipal Hospital",
        location: { city: "Bangalore", state: "Karnataka" },
        qualifications: ["MS", "FAMS"],
        experience: { years: 12, description: "Joint replacement specialist" },
        fees: { initial: 1200, followUp: 600 },
        availability: true
      },
      {
        name: "Dr. Sneha Gupta",
        specialization: "General Physician",
        hospital: "Max Hospital",
        location: { city: "Delhi", state: "Delhi" },
        qualifications: ["MBBS", "MD"],
        experience: { years: 8, description: "Primary care specialist" },
        fees: { initial: 500, followUp: 300 },
        availability: true
      },
      {
        name: "Dr. Vikram Singh",
        specialization: "Neurologist",
        hospital: "AIIMS",
        location: { city: "Delhi", state: "Delhi" },
        qualifications: ["DM", "DNB"],
        experience: { years: 20, description: "Expert in movement disorders" },
        fees: { initial: 1500, followUp: 800 },
        availability: true
      }
    ];

    const existing = await Doctor.countDocuments();
    if (existing > 0) {
      return res.json({ message: `${existing} doctors already exist`, count: existing });
    }

    const created = await Doctor.insertMany(doctors);
    res.status(201).json({ message: "Doctors seeded", count: created.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to seed doctors" });
  }
};
