const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const express = require("express");
const config = require("./config");

// ═══════════════════════════════════
//        WEB SERVER (Render er jonno)
// ═══════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;
let qrCodeData = "";
let botStatus = "Starting...";

app.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>WhatsApp Welcome Bot</title>
            <meta http-equiv="refresh" content="10">
            <style>
                body {
                    font-family: Arial;
                    text-align: center;
                    background: #1a1a2e;
                    color: white;
                    padding: 50px;
                }
                .status {
                    font-size: 24px;
                    margin: 20px;
                    color: #e94560;
                }
                img { border: 5px solid #e94560; border-radius: 10px; }
            </style>
        </head>
        <body>
            <h1>🤖 WhatsApp Welcome Bot</h1>
            <div class="status">Status: ${botStatus}</div>
            ${qrCodeData ? `<img src="${qrCodeData}" />` : "<p>Loading QR Code...</p>"}
            <p>Scan this QR with WhatsApp > Linked Devices</p>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log("Web server running on port " + PORT);
});

// ═══════════════════════════════════
//          BOT CLIENT
// ═══════════════════════════════════

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: "./auth"
    }),
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

// ═══════════════════════════════════
//          QR CODE
// ═══════════════════════════════════

client.on("qr", async function(qr) {
    console.log("QR Code received! Check the web URL to scan.");
    qrcode.generate(qr, { small: true });
    
    // Generate QR for web
    try {
        qrCodeData = await QRCode.toDataURL(qr);
        botStatus = "Scan QR Code below!";
    } catch (err) {
        console.error("QR generation error:", err);
    }
});

// ═══════════════════════════════════
//          BOT READY
// ═══════════════════════════════════

client.on("ready", function() {
    console.log("✅ BOT IS ONLINE!");
    botStatus = "✅ Bot is Online and Ready!";
    qrCodeData = "";
});

client.on("authenticated", function() {
    console.log("Authenticated!");
    botStatus = "Authenticated! Loading...";
});

client.on("auth_failure", function(msg) {
    console.error("Auth failed:", msg);
    botStatus = "❌ Authentication Failed!";
});

// ═══════════════════════════════════
//     NEW MEMBER WELCOME
// ═══════════════════════════════════

client.on("group_join", async function(notification) {
    try {
        var chat = await notification.getChat();
        var contact = await notification.getContact();
        var memberName = contact.pushname || "New Member";
        var memberNumber = contact.number;
        var memberCount = chat.participants.length;

        var now = new Date();
        var welcomeMsg = config.welcomeMessage
            .replace(/{name}/g, memberName)
            .replace(/{number}/g, memberNumber)
            .replace(/{time}/g, now.toLocaleTimeString())
            .replace(/{date}/g, now.toLocaleDateString())
            .replace(/{memberCount}/g, memberCount);

        await chat.sendMessage(welcomeMsg);
        console.log("Welcome sent to: " + memberName);
    } catch (error) {
        console.error("Welcome error:", error);
    }
});

// ═══════════════════════════════════
//     MEMBER LEAVE GOODBYE
// ═══════════════════════════════════

client.on("group_leave", async function(notification) {
    try {
        var chat = await notification.getChat();
        var contact = await notification.getContact();
        var memberName = contact.pushname || "Member";

        var goodbyeMsg = config.goodbyeMessage.replace(/{name}/g, memberName);
        await chat.sendMessage(goodbyeMsg);
        console.log("Goodbye sent: " + memberName);
    } catch (error) {
        console.error("Goodbye error:", error);
    }
});

// ═══════════════════════════════════
//        COMMANDS
// ═══════════════════════════════════

client.on("message", async function(message) {
    var body = message.body.toLowerCase().trim();

    if (body === "!ping") {
        await message.reply("🏓 Pong! Bot is alive!");
    }

    if (body === "!help") {
        var help = "*Commands*\n\n";
        help += "!ping - Bot check\n";
        help += "!help - This menu\n";
        help += "!rules - Group rules";
        await message.reply(help);
    }

    if (body === "!rules") {
        var rules = "*Group Rules*\n\n";
        rules += "1. Be respectful\n";
        rules += "2. No spam\n";
        rules += "3. Respect admins";
        await message.reply(rules);
    }
});

// ═══════════════════════════════════
//        ERROR HANDLERS
// ═══════════════════════════════════

client.on("disconnected", function(reason) {
    console.log("Disconnected:", reason);
    botStatus = "Disconnected! Restarting...";
});

process.on("unhandledRejection", function(reason) {
    console.error("Unhandled:", reason);
});

// ═══════════════════════════════════
//        START
// ═══════════════════════════════════

console.log("Starting bot...");
client.initialize();