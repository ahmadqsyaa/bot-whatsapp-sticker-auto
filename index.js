const sessionName = "fushigo";
const { useMultiFileAuthState,Browsers, downloadMediaMessage, DisconnectReason, downloadContentFromMessage,
  delay } = require('@whiskeysockets/baileys');
const makeWASocket = require('@whiskeysockets/baileys').default;
const {
  Sticker,
  createSticker,
  StickerTypes,
  extractMetadata
} = require("wa-sticker-formatter");
const { Boom } = require("@hapi/boom");
const pino = require("pino");
const fs = require('fs');

const express = require('express')
const app = express()
const port = 8001
path = require('path')

app.get('/', (req, res) => {
  res.send("status bot aktif");
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

    async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(
    `./${sessionName ? sessionName : "session"}`
  );
  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Desktop"),
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !==
            DisconnectReason.loggedOut
          : true;
      console.log(
        "connection closed",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );
      // reconnect if not logged out
      if (shouldReconnect) {
        startSock();
      }
    } else if (connection === "open") {
      console.log("connection open");
    }
  });

     sock.ev.on("messages.upsert", async (msg) => {
    try {
      if (!msg.messages) return;
      const m = msg.messages[0];
      if (m.key.fromMe) return;
      var from = m.key.remoteJid;
      let type = Object.keys(m.message)[0];
      const body =
        type === "conversation"
          ? m.message.conversation
          : type == "imageMessage"
            ? m.message.imageMessage.caption
            : type == "videoMessage"
              ? m.message.videoMessage.caption
              : type == "extendedTextMessage"
                ? m.message.extendedTextMessage.text
                : type == "buttonsResponseMessage"
                  ? m.message.buttonsResponseMessage.selectedButtonId
                  : type == "listResponseMessage"
                    ? m.message.listResponseMessage.singleSelectReply.selectedRowId
                    : type == "templateButtonReplyMessage"
                      ? m.message.templateButtonReplyMessage.selectedId
                      : type === "messageContextInfo"
                        ? m.message.listResponseMessage.singleSelectReply.selectedRowId ||
                        m.message.buttonsResponseMessage.selectedButtonId ||
                        m.text
                        : "";
      const isMedia = (type === 'imageMessage' || type === 'videoMessage')
      const isQuotedImage = type === 'extendedTextMessage' && content.includes('imageMessage')
      global.reply = async (text) => {
        await sock.sendPresenceUpdate("composing", from);
        return sock.sendMessage(from, { text }, { quoted: m });
      };

      sock.downloadMediaMessage = downloadMediaMessage
      async function downloadMediaMessage(message) {
        let mimes = (message.msg || message).mimetype || ''
        let messageType = mimes.split('/')[0].replace('application', 'document') ? mimes.split('/')[0].replace('application', 'document') : mimes.split('/')[0]
        let extension = mimes.split('/')[1]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
      }
      
      if (isMedia) {
        const message = isQuotedImage ? m.quoted : m.message.imageMessage
        const buff = await sock.downloadMediaMessage(message)
        const data = new Sticker(buff, { pack: 'stc', author: '©rick', type: StickerTypes.FULL, quality: 50, id: 'null' })
        await sock.sendMessage(from, await data.toMessage(), { quoted: m })
      }
    } catch (error) {
      console.log(error);
    }
  });
}
startSock()