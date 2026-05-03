export const recommendDoctorBySymptoms = (symptoms = []) => {
    const normalizedSymptoms = Array.isArray(symptoms) ? symptoms : [symptoms];
    const s = normalizedSymptoms.join(" ").toLowerCase();
  
    if (s.includes("chest")) return { doctor: "Cardiologist", specialization: "Cardiologist", urgency: "High" };
    if (s.includes("skin")) return { doctor: "Dermatologist", specialization: "Dermatologist", urgency: "Low" };
    if (s.includes("headache")) return { doctor: "Physician", specialization: "General Physician", urgency: "Medium" };
  
    return { doctor: "General Physician", specialization: "General Physician", urgency: "Low" };
  };
