require('dotenv').config();
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const payload = {
  contents: [{ parts: [{ text: "Hello, return a JSON object with key message: 'ok'." }] }]
};

const req = https.request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Body:", body);
  });
});

req.on('error', err => console.error("Req error:", err));
req.write(JSON.stringify(payload));
req.end();
