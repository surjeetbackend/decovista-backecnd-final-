require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { MessagingResponse } = require("twilio").twiml;
const twilio = require("twilio");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ Send WhatsApp to User
const sendToUser = async (name, phone) => {
  try {
    return await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:+91${phone}`,
      body: `Hi ${name}, thank you for contacting Decovista! We'll get back to you soon.\n\n📞 You can also call us directly at ${phone}.`,
    });
  } catch (err) {
    console.error("❌ Error sending to user:", err.message);
    throw err;
  }
};

// ✅ Send WhatsApp to Owner
const sendToOwner = async ({ name, phone, service, email }) => {
  const message = `📥 New Inquiry:\n👤 Name: ${name}\n📞 Phone: ${phone}\n📧 Email: ${email}\n🏠 Property: ${service}`;
  try {
    return await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: process.env.OWNER_PHONE,
      body: message,
    });
  } catch (err) {
    console.error("❌ Error sending to owner:", err.message);
    throw err;
  }
};

// ✅ Send WhatsApp Buttons
const sendWhatsAppButtons = async (toPhone) => {
  const payload = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: "👋 What type of property are you looking for?",
      },
      action: {
        buttons: [
          { type: "reply", reply: { id: "2bhk", title: "2BHK" } },
          { type: "reply", reply: { id: "3bhk", title: "3BHK" } },
          { type: "reply", reply: { id: "villa", title: "Villa" } },
           {type:"reply", reply:{id:"Independent house", title:"Independent house"}},
        ],
      },
    },
  };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Buttons sent:", res.data);
  } catch (err) {
    console.error("❌ Button send error:", err.response?.data || err.message);
    throw err;
  }
};

// ✅ Website Form Route
app.post("/submit-form", async (req, res) => {
  const { name, phone, service, email } = req.body;
  try {
    await sendToUser(name, phone);
    await sendToOwner({ name, phone, service, email });
    res.json({ status: "success", message: "Messages sent via WhatsApp." });
  } catch (err) {
    console.error("❌ /submit-form Error:", err.message);
    res.status(500).json({
      status: "error",
      message: err.message.includes("63038")
        ? "⚠️ Twilio daily message limit reached."
        : "❌ WhatsApp send failed. Try again.",
    });
  }
});

// ✅ Landbot Chat Route
app.post("/landbot-submit", async (req, res) => {
  const { name, phone, service, email } = req.body;
  try {
    await sendToUser(name, phone);
    await sendToOwner({ name, phone, service, email });
    res.json({ status: "success", message: "Lead captured via chat and WhatsApp sent." });
  } catch (err) {
    console.error("❌ /landbot-submit Error:", err.message);
    res.status(500).json({
      status: "error",
      message: err.message.includes("63038")
        ? "⚠️ Twilio daily message limit reached."
        : "❌ WhatsApp send failed. Try again.",
    });
  }
});

// ✅ WhatsApp Chatbot Session
const sessions = {};

app.post("/whatsapp", async (req, res) => {
  const twiml = new MessagingResponse();
  const msg = twiml.message();
  const incomingMsg = req.body.Body?.trim();
  const from = req.body.From;

  if (!sessions[from]) {
    sessions[from] = { step: 0, data: {} };
  }

  const session = sessions[from];

  try {
    switch (session.step) {
      case 0:
        await sendWhatsAppButtons(from.replace("whatsapp:", ""));
        session.step = 1;
        return res.end(twiml.toString());

      case 1:
        session.data.service = incomingMsg;
        msg.body("🔤 Great! What's your full name?");
        session.step = 2;
        break;

      case 2:
        session.data.name = incomingMsg;
        msg.body("📞 Please provide your 10-digit phone number.");
        session.step = 3;
        break;

      case 3:
        if (!/^\d{10}$/.test(incomingMsg)) {
          msg.body("❌ Please enter a valid 10-digit phone number.");
          break;
        }
        session.data.phone = incomingMsg;
        msg.body("📧 Now, please enter your email address.");
        session.step = 4;
        break;

      case 4:
        if (!incomingMsg.includes("@")) {
          msg.body("❌ Please enter a valid email address.");
          break;
        }
        session.data.email = incomingMsg;

        await sendToUser(session.data.name, session.data.phone);
        await sendToOwner(session.data);

        msg.body("✅ Thanks! Your info has been saved. We'll get in touch soon.");
        delete sessions[from];
        break;

      default:
        msg.body("🤖 Please type *Hi* to start again.");
        delete sessions[from];
        break;
    }
  } catch (err) {
    console.error("❌ WhatsApp Bot Error:", err.message);
    msg.body(
      err.message.includes("63038")
        ? "⚠️ Sorry, WhatsApp limit reached today. Try again tomorrow."
        : "⚠️ Something went wrong. Please try again."
    );
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
