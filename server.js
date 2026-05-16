// server.js
// Serveur WebSocket minimal TurboWarp <-> Mistral
// Compatible Render.com

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.get("/", (req, res) => {
  res.send("Server online");
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Historique de conversation pour CE client
  const history = [];

  ws.on("message", async (message) => {
    try {
      const userMessage = message.toString();

      // Ajoute le message utilisateur
      history.push({
        role: "user",
        content: userMessage,
      });

      // Limite l'historique
      if (history.length > 30) {
        history.splice(0, 2);
      }

      // Appel API Mistral
      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: history,
          }),
        }
      );

      const data = await response.json();

      const aiMessage =
        data?.choices?.[0]?.message?.content || "No response";

      // Sauvegarde réponse IA
      history.push({
        role: "assistant",
        content: aiMessage,
      });

      // Renvoie à TurboWarp
      ws.send(aiMessage);

    } catch (err) {
      console.error(err);

      ws.send(
        JSON.stringify({
          error: true,
          message: "Server error",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Port Render
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
