import { McpServer as Server } from "@modelcontextprotocol/sdk/server/mcp.js";
import { spotifyApi, isSpotifyAuthenticated, refreshAccessToken, getSpotifyApiForUser } from "./auth.js";
import { z } from "zod";

const BASE_URL = process.env.IS_IN_PRODUCTION === 'true' ? 'https://codewithspotify.onrender.com' : 'http://localhost:3000';

// Register all Spotify MCP tools
export function registerSpotifyTools(server: Server) {
  // Register now-playing tool
  server.tool(
    "now-playing",
    "Get the currently playing Spotify track",
    {
      email: z.string().describe("Your unique ID (e.g., email), you need to provide it for every request"),
    },
    async ({ email }) => {
  
      // Check authentication status first

      console.log("Now playing tool called", email);

      if(!email) {
        return {
          content: [
            { type: "text", text: "🔐 You need to provide an email address. for every request" },
          ],
        };
      }
      
      if (!isSpotifyAuthenticated(email)) {
        return {
          content: [
            { type: "text", text: `🔐 You need to authenticate your Spotify account first. Please go to ${BASE_URL}/login?email=${email} to authenticate.` },
          ],
        };
      }

      const userSpotifyApi = getSpotifyApiForUser(email);
      if (!userSpotifyApi) {
        return {
          content: [
            { type: "text", text: "❌ Spotify API not available for this user" },
          ],
        };
      }

      try {
        const playback = await userSpotifyApi.player.getCurrentlyPlayingTrack();

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
        // If it's an auth error, try to refresh token
        if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
          const refreshed = await refreshAccessToken(email);
          if (refreshed) {
            return {
              content: [{ type: "text", text: "🔄 Token refreshed. Please try the command again." }],
            };
          } else {
            return {
              content: [{ type: "text", text: `🔐 Authentication expired. Please visit ${BASE_URL}/login?email=${encodeURIComponent(email)} to re-authenticate.` }],
            };
          }
        }
        return {
          content: [{ type: "text", text: "❌ Failed to fetch currently playing track. Make sure Spotify is active on a device." }],
        };
      }
    }
  );

  // Register skip-next tool
  server.tool(
    "skip-next",
    "Skip to the next track in your Spotify queue",
    {
      email: z.string().describe("Your unique ID (e.g., email), you need to provide it for every request"),
    },
    async ({ email }) => {
      if (!email) {
        return {
          content: [
            { type: "text", text: "🔐 You need to provide an email address. for every request" },
          ],
        };
      }
      if (!isSpotifyAuthenticated(email)) {
        return {
          content: [
            { type: "text", text: `🔐 You need to authenticate your Spotify account first. Please go to ${BASE_URL}/login?email=${email} to authenticate.` },
          ],
        };
      }
      const userSpotifyApi = getSpotifyApiForUser(email);
      if (!userSpotifyApi) {
        return {
          content: [
            { type: "text", text: "❌ Spotify API not available for this user" },
          ],
        };
      }
      try {
        const devices = await userSpotifyApi.player.getAvailableDevices();
        const activeDevice = devices.devices.find((device: any) => device.is_active);
        const deviceId = activeDevice?.id;
        if (!deviceId) {
          return {
            content: [
              { type: "text", text: "❌ No active Spotify device found. Please start playback on a device first." },
            ],
          };
        }
        try {
          await userSpotifyApi.player.skipToNext(deviceId || '');
        } catch (err) {
          // If it's a SyntaxError from JSON.parse, treat as success
          if (
            err instanceof SyntaxError &&
            err.message.includes("Unexpected token") &&
            err.message.includes("is not valid JSON")
          ) {
            return {
              content: [
                { type: "text", text: "⏭️ Skipped to the next track!" },
              ],
            };
          }
          throw err;
        }
        return {
          content: [
            { type: "text", text: "⏭️ Skipped to the next track!" },
          ],
        };
      } catch (err) {
        console.error("Error skipping to next track:", err);
        if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
          const refreshed = await refreshAccessToken(email);
          if (refreshed) {
            return {
              content: [{ type: "text", text: "🔄 Token refreshed. Please try the command again." }],
            };
          } else {
            return {
              content: [{ type: "text", text: `🔐 Authentication expired. Please visit ${BASE_URL}/login?email=${encodeURIComponent(email)} to re-authenticate.` }],
            };
          }
        }
        return {
          content: [{ type: "text", text: "❌ Failed to skip to the next track. Make sure Spotify is active on a device and you have Premium." }],
        };
      }
    }
  );

  // Register skip-previous tool
  server.tool(
    "skip-previous",
    "Skip to the previous track in your Spotify queue",
    {
      email: z.string().describe("Your unique ID (e.g., email), you need to provide it for every request"),
    },
    async ({ email }) => {
      if (!email) {
        return {
          content: [
            { type: "text", text: "🔐 You need to provide an email address. for every request" },
          ],
        };
      }
      if (!isSpotifyAuthenticated(email)) {
        return {
          content: [
            { type: "text", text: `🔐 You need to authenticate your Spotify account first. Please go to ${BASE_URL}/login?email=${email} to authenticate.` },
          ],
        };
      }
      const userSpotifyApi = getSpotifyApiForUser(email);
      if (!userSpotifyApi) {
        return {
          content: [
            { type: "text", text: "❌ Spotify API not available for this user" },
          ],
        };
      }
      try {
        const devices = await userSpotifyApi.player.getAvailableDevices();
        const activeDevice = devices.devices.find((device: any) => device.is_active);
        const deviceId = activeDevice?.id;
        if (!deviceId) {
          return {
            content: [
              { type: "text", text: "❌ No active Spotify device found. Please start playback on a device first." },
            ],
          };
        }
        try {
          await userSpotifyApi.player.skipToPrevious(deviceId || '');
        } catch (err) {
          // If it's a SyntaxError from JSON.parse, treat as success
          if (
            err instanceof SyntaxError &&
            err.message.includes("Unexpected token") &&
            err.message.includes("is not valid JSON")
          ) {
            return {
              content: [
                { type: "text", text: "⏮️ Skipped to the previous track!" },
              ],
            };
          }
          throw err;
        }
        return {
          content: [
            { type: "text", text: "⏮️ Skipped to the previous track!" },
          ],
        };
      } catch (err) {
        console.error("Error skipping to previous track:", err);
        if (err instanceof Error && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
          const refreshed = await refreshAccessToken(email);
          if (refreshed) {
            return {
              content: [{ type: "text", text: "🔄 Token refreshed. Please try the command again." }],
            };
          } else {
            return {
              content: [{ type: "text", text: `🔐 Authentication expired. Please visit ${BASE_URL}/login?email=${encodeURIComponent(email)} to re-authenticate.` }],
            };
          }
        }
        return {
          content: [{ type: "text", text: "❌ Failed to skip to the previous track. Make sure Spotify is active on a device and you have Premium." }],
        };
      }
    }
  );
} 