require("dotenv").config();
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Replace with your verified WhatsApp number (with country code)
const toPhone = "whatsapp:+91XXXXXXXXXX";

client.messages
  .create({
    from: process.env.TWILIO_WHATSAPP_NUMBER,
    to: toPhone,
    body: "Hello from Twilio WhatsApp API!",
  })
  .then((message) => console.log("Message sent:", message.sid))
  .catch((err) => console.error("Error:", err));
