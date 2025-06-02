import { McpServer as Server } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let spotifyApi: SpotifyApi | null = null;
let isAuthenticated = false;

const scopes = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
];

// Generate random string for state parameter (security)
function generateRandomString(length: number): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Step 1: Request User Authorization (as per Spotify docs)
app.get("/login", async (req, res) => {
  try {
    const { default: open } = await import("open");
    
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    const state = generateRandomString(16);
    
    // Build authorization URL exactly as documented
    const authUrl = 'https://accounts.spotify.com/authorize?' + 
      new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scopes.join(' '),
        redirect_uri: redirectUri,
        state: state
      }).toString();
    
    // Store state for validation (in production, use secure session storage)
    (req as any).session = { state }; // Simple storage for demo
    
    await open(authUrl);
    res.send("Opening Spotify login...");
  } catch (error) {
    console.error("Error opening login:", error);
    res.status(500).send("Error opening login");
  }
});

// Step 2: Handle the callback and exchange code for access token
app.get("/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;
  
  if (error) {
    console.error("Authorization error:", error);
    res.status(400).send(`Authorization failed: ${error}`);
    return;
  }
  
  if (!code) {
    res.status(400).send("No authorization code provided");
    return;
  }
  
  try {
    // Step 3: Exchange authorization code for access token (as per Spotify docs)
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    
    // Prepare the token exchange request
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Initialize Spotify API with the access token
    spotifyApi = SpotifyApi.withAccessToken(clientId, tokenData);
    isAuthenticated = true;
    
    res.send("Authorization successful! You can close this tab.");
    console.log("Spotify authenticated successfully");
    console.log("Token Data:", {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token
    });
    console.log("Access Token expires in:", tokenData.expires_in, "seconds");
    
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send("Auth failed: " + (error as Error).message);
  }
});

const server = new Server({
  name: "spotify-mcp",
  version: "1.0.0"
}, {
  capabilities: {}
});

// Register now-playing tool
server.tool(
  "now-playing",
  "Get the currently playing Spotify track",
  {},
  async () => {
    if (!spotifyApi || !isAuthenticated) {
      return {
        content: [
          { type: "text", text: "Spotify is not authenticated. Please visit http://localhost:3000/login" },
        ],
      };
    }
    
    try {
      const playback = await spotifyApi.player.getCurrentlyPlayingTrack();
      
      if (playback && playback.is_playing && playback.item && playback.item.type === 'track') {
        const track = playback.item as any;
        return {
          content: [
            {
              type: "text",
              text: `🎵 Now playing: **${track.name}** by **${track.artists?.map((a: any) => a.name).join(", ") || "Unknown artist"}**`,
            },
          ],
        };
      } else {
        return {
          content: [{ type: "text", text: "🔇 Nothing is currently playing." }],
        };
      }
    } catch (err) {
      console.error("Error fetching now playing:", err);
      return {
        content: [{ type: "text", text: "❌ Failed to fetch currently playing track. Make sure Spotify is active on a device." }],
      };
    }
  }
);

let transport: SSEServerTransport | null = null;

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

// Start Spotify auth server on port 3000
app.listen(3000, () => {
  console.log(`🚀 Spotify auth server started on http://localhost:3000`);
  console.log(`🎧 Spotify auth: http://localhost:3000/login`);
});

// Create separate MCP server on port 3300
const mcpApp = express();
mcpApp.use(cors());

let mcpTransport: SSEServerTransport | null = null;

mcpApp.get("/sse", (req, res) => {
  mcpTransport = new SSEServerTransport("/messages", res);
  server.connect(mcpTransport);
});

mcpApp.post("/messages", (req, res) => {
  if (mcpTransport) {
    mcpTransport.handlePostMessage(req, res);
  }
});

mcpApp.listen(3300, () => {
  console.log(`📡 MCP server started on http://localhost:3300`);
  console.log(`📡 MCP SSE endpoint: http://localhost:3300/sse`);
});