const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const express = require("express");
const config = require("./config");

// Web Server (Render er jonno dorkar)
const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = "";
let botStatus = "Starting...";

app.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>WhatsApp Bot</title>
            <meta http-equiv="refresh" content="10">
            <style>
                body { font-family: Arial; text-align: center; background: #1a1a2e; color: white; padding: 50px; }
                .status { font-size: 24px; margin: 20px; color: #e94560; }
                img { border: 5px solid #e94560; border-radius: 10px; }
            </style>
        </head>
        <body>
            <h1>🤖 WhatsApp Welcome Bot</h1>
            <div class="status">Status: ${botStatus}</div>
            ${qrCodeData ? `<img src="${qrCodeData}" />` : "<p>Loading...</p>"}
            <p>WhatsApp > Linked Devices > Scan</p>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log("Server on port " + PORT));

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./auth" }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu"
        ]
    }
});

// QR Code
client.on("qr", async function(qr) {
    console.log("QR received! Open web URL to scan.");
    qrcode.generate(qr, { small: true });
    try {
        qrCodeData = await QRCode.toDataURL(qr);
        botStatus = "Scan QR Code below!";
    } catch (err) {
        console.error("QR error:", err);
    }
});

// Ready
client.on("ready", function() {
    console.log("BOT IS ONLINE!");
    botStatus = "Bot is Online!";
    qrCodeData = "";
});

client.on("authenticated", () => {
    console.log("Authenticated!");
    botStatus = "Authenticated!";
});

client.on("auth_failure", (msg) => {
    console.error("Auth failed:", msg);
});

// Welcome
client.on("group_join", async function(notification) {
    try {
        var chat = await notification.getChat();
        var contact = await notification.getContact();
        var name = contact.pushname || "New Member";
        var number = contact.number;
        var count = chat.participants.length;
        var now = new Date();

        var msg = config.welcomeMessage
            .replace(/{name}/g, name)
            .replace(/{number}/g, number)
            .replace(/{time}/g, now.toLocaleTimeString())
            .replace(/{date}/g, now.toLocaleDateString())
            .replace(/{memberCount}/g, count);

        await chat.sendMessage(msg);
        console.log("Welcome sent: " + name);
    } catch (error) {
        console.error("Welcome error:", error);
    }
});

// Goodbye
client.on("group_leave", async function(notification) {
    try {
        var chat = await notification.getChat();
        var contact = await notification.getContact();
        var name = contact.pushname || "Member";
        var msg = config.goodbyeMessage.replace(/{name}/g, name);
        await chat.sendMessage(msg);
        console.log("Goodbye sent: " + name);
    } catch (error) {
        console.error("Goodbye error:", error);
    }
});

// Commands
client.on("message", async function(message) {
    var body = message.body.toLowerCase().trim();
    if (body === "!ping") await message.reply("Pong! Bot alive!");
    if (body === "!help") await message.reply("Commands: !ping, !help, !rules");
    if (body === "!rules") await message.reply("Rules: Be respectful, No spam!");
});

// Errors
client.on("disconnected", (reason) => {
    console.log("Disconnected:", reason);
    botStatus = "Disconnected!";
});

process.on("unhandledRejection", (reason) => console.error("Error:", reason));

console.log("Starting bot...");
client.initialize();
