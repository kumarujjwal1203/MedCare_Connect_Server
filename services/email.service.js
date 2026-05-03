import nodemailer from "nodemailer";

// ── Password reset email ─────────────────────────────────────────────────────
export const sendPasswordResetEmail = async ({ toEmail, userName, resetUrl }) => {
  const transporter = getTransporter();

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:32px;text-align:center">
            <div style="font-size:36px;margin-bottom:8px">🔐</div>
            <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Reset Your Password</h1>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">MedCare Connect Account Recovery</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="color:#1f2937;font-size:15px;margin:0 0 12px">Hi <strong>${userName}</strong>,</p>
            <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 24px">
              We received a request to reset your MedCare Connect account password.
              Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.
            </p>

            <!-- CTA button -->
            <div style="text-align:center;margin:28px 0">
              <a href="${resetUrl}"
                style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 36px;
                       border-radius:10px;font-size:15px;font-weight:600;display:inline-block">
                Reset Password
              </a>
            </div>

            <!-- Warning box -->
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-top:8px">
              <p style="margin:0;font-size:13px;color:#92400e">
                ⚠️ If you did not request this, you can safely ignore this email.
                Your password will not change.
              </p>
            </div>

            <!-- Link fallback -->
            <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">
              If the button doesn't work, paste this link in your browser:<br/>
              <a href="${resetUrl}" style="color:#2563eb;word-break:break-all">${resetUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;text-align:center">
            <p style="margin:0;font-size:12px;color:#9ca3af">MedCare Connect — AI-Powered Health Assistant</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"MedCare Connect" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your MedCare Connect password",
    html,
  });
};

// ── Dummy pharmacy emails (used when real email is unavailable) ──────────────
export const resolvePharmacyEmail = (pharmacy = {}) => {
  if (typeof pharmacy === "string") {
    return "";
  }

  return pharmacy.email || pharmacy.contact?.email || "";
};

// ── Transporter (lazy-initialised so missing creds don't crash startup) ──────
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass || user.includes("your_gmail") || pass.includes("your_app")) {
    throw new Error(
      "Email not configured. Set EMAIL_USER and EMAIL_PASS in Server/.env"
    );
  }

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return _transporter;
};

// ── HTML email template ──────────────────────────────────────────────────────
const buildOrderEmail = ({ pharmacyName, medicineName, userName, userAddress, userPhone, orderId, timestamp }) => ({
  subject: `💊 New Medicine Order — ${medicineName}`,
  html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:28px 32px;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">💊</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">New Medicine Order</h1>
              <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">via MedCare Connect Platform</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:28px 32px 0">
              <p style="margin:0;color:#1f2937;font-size:15px">
                Dear <strong>${pharmacyName}</strong>,
              </p>
              <p style="margin:10px 0 0;color:#4b5563;font-size:14px;line-height:1.6">
                You have received a new medicine order request through the <strong>MedCare Connect</strong> platform.
                Please review the details below and confirm availability.
              </p>
            </td>
          </tr>

          <!-- Order details box -->
          <tr>
            <td style="padding:20px 32px">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;overflow:hidden">
                <tr>
                  <td style="padding:18px 20px;border-bottom:1px solid #dbeafe">
                    <p style="margin:0;font-size:11px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:.8px">
                      Order ID
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#1f2937;font-weight:600">#${orderId}</p>
                  </td>
                  <td style="padding:18px 20px;border-bottom:1px solid #dbeafe;border-left:1px solid #dbeafe">
                    <p style="margin:0;font-size:11px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:.8px">
                      Date &amp; Time
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#1f2937">${timestamp}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:18px 20px;background:#dbeafe">
                    <p style="margin:0;font-size:11px;color:#1d4ed8;font-weight:700;text-transform:uppercase;letter-spacing:.8px">
                      Medicine Required
                    </p>
                    <p style="margin:4px 0 0;font-size:20px;color:#1e3a8a;font-weight:700">${medicineName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Patient info -->
          <tr>
            <td style="padding:0 32px 20px">
              <h3 style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:700;text-transform:uppercase;letter-spacing:.5px">
                Patient Information
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0"
                style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
                <tr style="background:#f9fafb">
                  <td style="padding:12px 16px;width:35%;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6">
                    👤 Patient Name
                  </td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6">
                    ${userName}
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #f3f4f6;background:#f9fafb">
                    📍 Delivery Address
                  </td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6">
                    ${userAddress}
                  </td>
                </tr>
                ${userPhone ? `
                <tr style="background:#f9fafb">
                  <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600">
                    📞 Phone
                  </td>
                  <td style="padding:12px 16px;font-size:13px;color:#111827">
                    ${userPhone}
                  </td>
                </tr>` : ""}
              </table>
            </td>
          </tr>

          <!-- Action banner -->
          <tr>
            <td style="padding:0 32px 20px">
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px">
                <p style="margin:0;font-size:13px;color:#92400e;font-weight:600">
                  ⚡ Action Required
                </p>
                <p style="margin:6px 0 0;font-size:13px;color:#78350f;line-height:1.5">
                  Please confirm availability and contact the patient for delivery or pickup arrangements.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
              <p style="margin:0;font-size:12px;color:#9ca3af">
                This is an automated order from <strong>MedCare Connect</strong>. Do not reply to this email.
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:#d1d5db">
                MedCare Connect — AI-Powered Health Assistant Platform
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
});

// ── Confirmation email to patient ────────────────────────────────────────────
const buildConfirmationEmail = ({ userName, medicineName, pharmacyName, pharmacyAddress, orderId }) => ({
  subject: `✅ Order Confirmed — ${medicineName}`,
  html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#10b981);padding:28px 32px;text-align:center">
              <div style="font-size:40px;margin-bottom:8px">✅</div>
              <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Order Request Sent!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px">
              <p style="color:#1f2937;font-size:15px">Hi <strong>${userName}</strong>,</p>
              <p style="color:#4b5563;font-size:14px;line-height:1.6">
                Your order for <strong>${medicineName}</strong> has been sent to
                <strong>${pharmacyName}</strong>. They will contact you shortly.
              </p>
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:16px;margin-top:16px">
                <p style="margin:0;font-size:13px;color:#065f46"><strong>Order #${orderId}</strong></p>
                <p style="margin:6px 0 0;font-size:13px;color:#047857">📍 ${pharmacyName}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280">${pharmacyAddress}</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;text-align:center">
              <p style="font-size:12px;color:#9ca3af">MedCare Connect — AI-Powered Health Assistant</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
});

// ── Public send functions ─────────────────────────────────────────────────────

export const sendPharmacyOrderEmail = async ({
  pharmacyEmail,
  pharmacyName,
  medicineName,
  userName,
  userEmail,
  userAddress,
  userPhone,
  orderId,
}) => {
  const transporter = getTransporter();
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const { subject, html } = buildOrderEmail({
    pharmacyName, medicineName, userName, userAddress, userPhone, orderId, timestamp,
  });

  // Send to pharmacy
  await transporter.sendMail({
    from: `"MedCare Connect Orders" <${process.env.EMAIL_USER}>`,
    to: pharmacyEmail,
    subject,
    html,
  });

  // Send confirmation to patient
  if (userEmail) {
    const conf = buildConfirmationEmail({ userName, medicineName, pharmacyName, pharmacyAddress: "", orderId });
    await transporter.sendMail({
      from: `"MedCare Connect" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: conf.subject,
      html: conf.html,
    });
  }
};
