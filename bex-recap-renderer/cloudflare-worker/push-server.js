import webpush from "web-push";
import express from "express";

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://bextrader.com");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});
const VAPID_PUBLIC_KEY = "BHrs0ojG1Xuts7zJC6Z_HJa4ZMT_Nm-OJHfq6x6jQB0R23zy6-Ge2RkIz_BKPBNVb6XdTE-nAeaS-WrhfEK_gIs";

const VAPID_PRIVATE_KEY = "VgISyiaUiN9opIVrP0NnJ-Y0cvudw9KPsSIeTLfJ6jQ";
webpush.setVapidDetails(
  "mailto:support@bextrader.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// اینجا باید از DB واقعی بخونی (فعلاً تستی)
let subscriptions = [];

app.post("/subscribe", (req, res) => {
  subscriptions.push(req.body);
  res.json({ ok: true });
});

app.post("/send", async (req, res) => {
  const payload = JSON.stringify({
    title: req.body.title,
    body: req.body.body
  });

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
    } catch (e) {
     console.error("Push error:", {
  message: e.message,
  statusCode: e.statusCode,
  body: e.body,
  headers: e.headers
});
    }
  }

  res.json({ ok: true, sent: subscriptions.length });
});

app.listen(3000, () => {
  console.log("Push server running on http://localhost:3000");
});