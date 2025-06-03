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

async function main() {
  let transport: SSEServerTransport | null = null;    
  app.get("/sse", (req: Request, res: Response) => {
    transport = new SSEServerTransport("/messages", res);
    server.connect(transport);
  });

  app.post("/messages", (req: Request, res: Response) => {
    if (transport) {
      transport.handlePostMessage(req, res);
    }
  });

  // Start server
  app.listen(3000, () => {
    console.log(`🚀 Spotify auth server started on https://codewithspotify.onrender.com`);
    console.log(`🎧 Authentication will open automatically when needed`);
    console.log(`📡 MCP server started on https://codewithspotify.onrender.com`);
    console.log(`📡 MCP SSE endpoint: https://codewithspotify.onrender.com/sse`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
