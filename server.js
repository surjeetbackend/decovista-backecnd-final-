require("dotenv").config();
const express = require("express");
const cors = require("cors");
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send WhatsApp to User
const sendToUser = async (name, phone) => {
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:+91${phone}`,
    body: `Hi ${name}, thank you for contacting Decovista! We'll get back to you soon.\n Or You Can Call Owner team ${phone}`,
  });
};

// Send WhatsApp to Owner
const sendToOwner = async ({ name, phone, service, email }) => {
  const message = `📥 New Inquiry:
👤 Name: ${name}
📞 Phone: ${phone}
📧 Email: ${email}
🏠 Property: ${service}`;

  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: process.env.OWNER_PHONE,
    body: message,
  });
};

app.post("/submit-form", async (req, res) => {
  const { name, phone, service, email } = req.body;

  try {
    await sendToUser(name, phone); // Optional: include email if needed in message
    await sendToOwner({ name, phone, service, email });

    res.json({ status: "success", message: "Messages sent to user and owner." });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
