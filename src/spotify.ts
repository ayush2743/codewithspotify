import { McpServer as Server } from "@modelcontextprotocol/sdk/server/mcp.js";
import { spotifyApi, isAuthenticated, isSpotifyAuthenticated } from "./auth.js";
import { ensureAuthenticated } from "./auth.js";

// Register all Spotify MCP tools
export function registerSpotifyTools(server: Server) {
  // Register now-playing tool
  server.tool(
    "now-playing",
    "Get the currently playing Spotify track",
    {},
    async () => {
      // Check authentication status first
      if (!isSpotifyAuthenticated()) {
        return {
          content: [
            { type: "text", text: "🔐 You need to authenticate your Spotify account first. Please go to https://codewithspotify.onrender.com/login to authenticate." },
          ],
        };
      }

      if (!spotifyApi) {
        return {
          content: [
            { type: "text", text: "❌ Spotify API not available" },
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
        
        // If it's an auth error, try to re-authenticate
        if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
          return {
            content: [{ type: "text", text: "🔐 Token expired. Please try again - authentication will be triggered automatically." }],
          };
        }
        
        return {
          content: [{ type: "text", text: "❌ Failed to fetch currently playing track. Make sure Spotify is active on a device." }],
        };
      }
    }
  );
} 