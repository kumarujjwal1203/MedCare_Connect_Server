import PharmacyRequest from "../models/PharmacyRequest.model.js";
import User from "../models/User.model.js";
import {
  findNearbyPharmacies,
  getPlaceDetails,
  reverseGeocode,
} from "../services/maps.service.js";
import {
  sendPharmacyOrderEmail,
  resolvePharmacyEmail,
} from "../services/email.service.js";

/**
 * GET /api/pharmacy/nearby?lat=&lng=&radius=&medicine=
 */
export const getNearbyPharmacies = async (req, res) => {
  try {
    const { lat, lng, radius = 5000, medicine } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const pharmacies = await findNearbyPharmacies(parsedLat, parsedLng, parseInt(radius));

    res.json({
      count: pharmacies.length,
      medicine: medicine || null,
      userLocation: { lat: parsedLat, lng: parsedLng },
      pharmacies,
    });
  } catch (error) {
    console.error("getNearbyPharmacies error:", error.message);
    res.status(500).json({ message: error.message || "Failed to fetch nearby pharmacies" });
  }
};

/**
 * GET /api/pharmacy/details/:placeId
 */
export const getPharmacyDetails = async (req, res) => {
  try {
    const details = await getPlaceDetails(req.params.placeId);
    res.json(details);
  } catch (error) {
    console.error("getPharmacyDetails error:", error.message);
    res.status(500).json({ message: "Failed to fetch pharmacy details" });
  }
};

/**
 * POST /api/pharmacy/request
 * Places an order: saves to DB + sends email to pharmacy + confirmation to patient.
 * Body: { medicineName, userLocation:{lat,lng,address?}, pharmacy:{...} }
 */
export const sendMedicineRequest = async (req, res) => {
  try {
    const { medicineName, userLocation, pharmacy } = req.body;

    if (!medicineName?.trim() || !userLocation?.lat || !userLocation?.lng || !pharmacy?.name) {
      return res.status(400).json({
        message: "medicineName, userLocation (lat/lng), and pharmacy details are required",
      });
    }

    const user = await User.findById(req.user.id).select("name email");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Resolve a human-readable address
    let userAddress = userLocation.address || "";
    if (!userAddress) {
      try {
        userAddress = await reverseGeocode(userLocation.lat, userLocation.lng);
      } catch {
        userAddress = `${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)}`;
      }
    }

    // Fetch phone if not already present
    let pharmacyPhone = pharmacy.phone || null;
    if (!pharmacyPhone && pharmacy.placeId) {
      try {
        const details = await getPlaceDetails(pharmacy.placeId);
        pharmacyPhone = details.phone;
      } catch { /* optional */ }
    }

    const pharmacyEmail = resolvePharmacyEmail(pharmacy);

    const orderId = generateOrderId();
    const notificationMessage = buildNotificationMessage(
      user.name, medicineName, userAddress, pharmacy.name, orderId
    );

    // Save to DB
    const request = await PharmacyRequest.create({
      userId: req.user.id,
      medicineName: medicineName.trim(),
      userLocation: { lat: userLocation.lat, lng: userLocation.lng, address: userAddress },
      pharmacy: {
        placeId: pharmacy.placeId || "",
        name: pharmacy.name,
        address: pharmacy.address || "",
        phone: pharmacyPhone,
        rating: pharmacy.rating ?? null,
        isOpen: pharmacy.isOpen ?? null,
        location: pharmacy.location || {},
      },
      status: "sent",
      notificationMessage,
    });

    let emailStatus = { sent: false, error: null };
    if (pharmacyEmail) {
      try {
        await sendPharmacyOrderEmail({
          pharmacyEmail,
          pharmacyName: pharmacy.name,
          medicineName: medicineName.trim(),
          userName: user.name,
          userEmail: user.email,
          userAddress,
          userPhone: pharmacyPhone,
          orderId,
        });
        emailStatus.sent = true;
      } catch (emailErr) {
        console.error("Email send failed:", emailErr.message);
        emailStatus.error = emailErr.message;
      }
    } else {
      emailStatus.error = "Pharmacy email is unavailable";
    }

    res.status(201).json({
      message: emailStatus.sent
        ? "Order placed and email sent to pharmacy!"
        : "Order saved. Pharmacy email is unavailable or email delivery is not configured.",
      orderId,
      request,
      emailStatus,
      pharmacyContact: {
        name: pharmacy.name,
        email: pharmacyEmail,
        phone: pharmacyPhone,
        address: pharmacy.address,
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.location?.lat},${pharmacy.location?.lng}`,
      },
      notificationMessage,
    });
  } catch (error) {
    console.error("sendMedicineRequest error:", error.message);
    res.status(500).json({ message: "Failed to place order" });
  }
};

/**
 * GET /api/pharmacy/requests
 */
export const getMyRequests = async (req, res) => {
  try {
    const requests = await PharmacyRequest.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

/**
 * DELETE /api/pharmacy/requests/:id
 */
export const deleteRequest = async (req, res) => {
  try {
    const request = await PharmacyRequest.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!request) return res.status(404).json({ message: "Request not found" });
    res.json({ message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete request" });
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderId() {
  return `HA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function buildNotificationMessage(userName, medicine, userAddress, pharmacyName, orderId) {
  return (
    `Order ID   : ${orderId}\n` +
    `To         : ${pharmacyName}\n` +
    `Medicine   : ${medicine}\n` +
    `Patient    : ${userName}\n` +
    `Location   : ${userAddress}\n\n` +
    `Please confirm availability and arrange delivery or keep the medicine ready for pickup.\n` +
    `This order was placed via MedCare Connect.`
  );
}
