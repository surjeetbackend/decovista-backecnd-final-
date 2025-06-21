require("dotenv").config();
const express = require("express");
const { MessagingResponse } = require("twilio").twiml;
const saveToSheet = require("./googleSheet");

const app = express();
app.use(express.urlencoded({ extended: true }));

const sessions = {}; // basic session tracking by phone number

app.post("/whatsapp", async (req, res) => {
  const twiml = new MessagingResponse();
  const msg = req.body.Body.trim();
  const from = req.body.From;

  if (!sessions[from]) {
    sessions[from] = { step: 0, name: "", message: "" };
  }

  const session = sessions[from];

  if (session.step === 0) {
    twiml.message("Hi! Welecome to DecoVista\n  What's your name?");
    session.step = 1;
  } else if (session.step === 1) {
    session.name = msg;
    twiml.message(`Hi ${msg}, what's your message or query?`);
    session.step = 2;
  } else if (session.step === 2) {
    session.message = msg;
    await saveToSheet(session.name, session.message);
    twiml.message("Thanks! Your response has been recorded.");
    session.step = 0; // reset
  }

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
