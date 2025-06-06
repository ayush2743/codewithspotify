import { McpServer as Server } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { loginHandler, callbackHandler } from "./auth.js";
import { registerSpotifyTools } from "./spotify.js";

dotenv.config();

const app = express();
app.use(cors());

// Initialize MCP Server
const server = new Server({
  name: "spotify-mcp",
  version: "1.0.0"
}, {
  capabilities: {}
});

// Register Spotify tools
registerSpotifyTools(server);

// Authentication routes
app.get("/login", loginHandler);
app.get("/callback", callbackHandler);

// Map to store transports per email
const transports = new Map<string, SSEServerTransport>();

async function main() {
  app.get("/sse", (req: Request, res: Response) => {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).send("Missing email parameter in /sse endpoint");
      return;
    }
    const transport = new SSEServerTransport("/messages?email=" + email, res);
    transports.set(email, transport);
    server.connect(transport);
  });

  app.post("/messages", (req: Request, res: Response) => {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).send("Missing email parameter in /messages endpoint");
      return;
    }
    console.log("++++++++++++++++++++");
    console.log("transports", transports);
    console.log("++++++++++++++++++++");
    
    const transport = transports.get(email);
    if (transport) {
      transport.handlePostMessage(req, res);
    } else {
      res.status(404).send("No transport found for this email. Please (re)connect to /sse first.");
    }
  });

  // Start server
  app.listen(3000, () => {
    console.log(`🚀 Spotify auth server started on http://localhost:3000`);
    console.log(`🎧 Authentication will open automatically when needed`);
    console.log(`📡 MCP server started on http://localhost:3000`);
    console.log(`📡 MCP SSE endpoint: http://localhost:3000/sse`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
