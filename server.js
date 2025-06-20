require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MessagingResponse } = require("twilio").twiml;
const twilio = require("twilio");
const { google } = require("googleapis");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✨ Google Sheets Auth
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ["https://www.googleapis.com/auth/spreadsheets"]
);

// ✅ Save to Google Sheet
const saveToGoogleSheet = async ({ name, phone, service, email }) => {
  const sheets = google.sheets({ version: "v4", auth });
  await auth.authorize();

  return sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A:D",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [[name, phone, email, service]],
    },
  });
};

// ✅ Send WhatsApp to User
const sendToUser = async (name, phone) => {
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: `whatsapp:+91${phone}`,
    body: `Hi ${name}, thank you for contacting Decovista! We'll get back to you soon.\nOr You Can Call Our Team: ${phone}`,
  });
};

// ✅ Send WhatsApp to Owner
const sendToOwner = async ({ name, phone, service, email }) => {
  const message = `📥 New Inquiry:\n👤 Name: ${name}\n📞 Phone: ${phone}\n📧 Email: ${email}\n🏠 Property: ${service}`;
  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: process.env.OWNER_PHONE,
    body: message,
  });
};

// ✅ Bot-based Chat from WhatsApp
app.post('/whatsapp', (req, res) => {
  const incomingMsg = req.body.Body?.toLowerCase() || '';
  const twiml = new MessagingResponse();
  const msg = twiml.message();

  if (incomingMsg.includes('hi') || incomingMsg.includes('hello')) {
    msg.body("👋 Hi! Welcome to Decovista. What kind of property are you looking for?\n1. 2BHK\n2. 3BHK\n3. Villa");
  } else if (incomingMsg.includes('2bhk') || incomingMsg.includes('3bhk') || incomingMsg.includes('villa')) {
    msg.body("👍 Great choice! Please reply with your full name.");
  } else if (incomingMsg.includes('surjeet')) {
    msg.body("✅ Thank you Surjeet! Our team will reach out shortly.");
    // ✅ Optional: Save to Google Sheets from bot too
  } else {
    msg.body("🤖 I'm sorry, I didn't understand. Please type 'Hi' to start.");
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

// ✅ Contact Form Submission Route
app.post("/submit-form", async (req, res) => {
  const { name, phone, service, email } = req.body;

  try {
    await sendToUser(name, phone);
    await sendToOwner({ name, phone, service, email });
    await saveToGoogleSheet({ name, phone, service, email });

    res.json({ status: "success", message: "Messages sent and saved to sheet." });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
