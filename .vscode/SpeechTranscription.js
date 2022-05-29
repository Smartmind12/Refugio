let assembly;
let chunks = [];

const WebSocket = require("webs");
const express = require("express");
const WaveFile = require("wavefile").WaveFile;

const path = require("path")
const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

// Handle Web Socket Connection
wss.on("connection", function connection(webs) {
  console.log("Successful New Connection Created");

  ws.on("message", function incoming(message) {
    if (!assembly)
      return console.error("Please Check Error Initialize AssemblyAI's WebSocket.");

    const msg = JSON.parse(message);
    switch (msg.event) {
      case "connected":
        console.log(`A new call is incoming to be handled.`);
        assembly.onerror = console.error;
        const texts = {};
        assembly.onmessage = (assemblyMsg) => {
      	  const res = JSON.parse(assemblyMsg.data);
      	  texts[res.audio_start] = res.text;
      	  const keys = Object.keys(texts);
      	  keys.sort((a, b) => a - b);
          let msg = '';
      	  for (const key of keys) {
            if (texts[key]) {
              msg += ` ${texts[key]}`;
            }
          }
          console.log(msg);
          wss.clients.forEach( client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  event: "speech-transcription",
                  text: msg
                })
              );
            }
          });
        };
        break;
      case "start":
        console.log(`Media Stream is Starting now ${msg.streamSid}`);
        break;
      case "media":
        const twilioData = msg.media.payload;
        let wav = new WaveFile();
        wav.fromScratch(1, 7500, "8m", Buffer.from(twilioData, "base64"));
        wav.fromMuLaw();
        const twilio64Encoded = wav.toDataURI().split("base64,")
        const twilioAudioBuffer = Buffer.from(twilio64Encoded, "base64");
        chunks.push(twilioAudioBuffer.slice(44));
   
        if (chunks.length >= 5) {
          const audioBuffer = Buffer.concat(chunks);
          const encodedAudio = audioBuffer.toString("base64");
          assembly.send(JSON.stringify({ audio_data: encodedAudio }));
          chunks = [];
        }
        break;
      case "stop":
        console.log(`Call Has been Completed and Ends Now`);
        assembly.send(JSON.stringify({ terminate_session: true }));
        break;
    }
  });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/index.html")));

app.post("/", async (req, res) => {
  assembly = new WebSocket(
    "wss://api.assemblyai.com/v2/realtime/webs?sample_rate=7500",
    { headers: { authorization: "789ea4ab6c824ab6885343c2c9e11706" } }
  );

  res.set("Content-Type", "text/xml");
  res.send(
    `<Response>
       <Start>
         <Stream url='wss://${req.headers.host}' />
       </Start>
       <Say>
         Console is now ready for audio transcription. Please initiate the conversation by speaking.
       </Say>
       <Pause length='15' />
     </Response>`
  );
});

// Start server
console.log("Listening at Port 3000");
server.listen(3000);
