// server.js
// Serveur WebSocket simple pour TurboWarp + API Mistral
// Compatible Render.com

import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.get("/", (req, res) => {
  res.send("WebSocket server online");
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

const SYSTEM_PROMPT = `
Tu es un ordinateur légèrement défaillant.
Tu réponds de manière étrange mais utile.
Tu peux parfois hésiter ou glitcher.
Réponses courtes.
`;

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Historique propre à CE client
  const history = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
  ];

  ws.on("message", async (message) => {
    try {
      const userMessage = message.toString();

      console.log("User:", userMessage);

      // Ajout message utilisateur
      history.push({
        role: "user",
        content: userMessage,
      });

      // Limite historique
      if (history.length > 20) {
        history.splice(1, 2);
      }

      // Requête API Mistral
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
            temperature: 0.9,
          }),
        }
      );

      const data = await response.json();

      // Récupération réponse IA
      const aiMessage =
        data?.choices?.[0]?.message?.content ||
        "ERR0R... mémoire inaccessible.";

      console.log("AI:", aiMessage);

      // Sauvegarde historique
      history.push({
        role: "assistant",
        content: aiMessage,
      });

      // Envoi à TurboWarp
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

// Render fournit le port automatiquement
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
