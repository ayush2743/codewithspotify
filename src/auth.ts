import { Request, Response } from "express";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import dotenv from "dotenv";
import { getAuthPageHTML, getSuccessPageHTML, getErrorPageHTML } from "./template.js";

dotenv.config();

export let spotifyApi: SpotifyApi | null = null;
export let isAuthenticated = false;

const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-library-read',
  'user-library-modify',
  'user-read-recently-played',
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

// Store pending auth promises
let pendingAuthPromise: Promise<boolean> | null = null;
let storedState: string | null = null;

// Store refresh token in memory
let refreshToken: string | null = null;

// HTML Templates

// Step 1: Request User Authorization (as per Spotify docs)
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    storedState = generateRandomString(16);

    // Build authorization URL exactly as documented
    const authUrl = 'https://accounts.spotify.com/authorize?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scopes.join(' '),
        redirect_uri: redirectUri,
        state: storedState,
        show_dialog: 'true'
      }).toString();

    // Instead of opening the browser, show a styled button for authentication
    res.send(getAuthPageHTML().replace("%AUTH_URL%", authUrl));
  } catch (error) {
    console.error("Error generating login URL:", error);
    res.status(500).send(getErrorPageHTML(`Error generating login URL: ${error}`));
  }
};

// Step 2: Handle the callback and exchange code for access token
export const callbackHandler = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    console.error("Authorization error:", error);
    res.status(400).send(getErrorPageHTML(`Authorization failed: ${error}`));
    return;
  }

  if (state !== storedState) {
    console.error("State mismatch error");
    res.status(400).send(getErrorPageHTML("State verification failed.", "🔒"));
    return;
  }

  if (!code) {
    res.status(400).send(getErrorPageHTML("No authorization code received.", "⚠️"));
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

    // Store refresh token
    refreshToken = tokenData.refresh_token || refreshToken;

    // Initialize Spotify API with the access token
    spotifyApi = SpotifyApi.withAccessToken(clientId, tokenData);
    isAuthenticated = true;

    res.send(getSuccessPageHTML());
    
    console.log("Spotify authenticated successfully");
    console.log("Access Token expires in:", tokenData.expires_in, "seconds");

  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send(getErrorPageHTML(`Failed to exchange authorization code for tokens: ${(error as Error).message}`, "💥"));
  }
};

// Check if we need authentication
export async function needsAuthentication(): Promise<boolean> {
  if (!spotifyApi || !isAuthenticated) {
    return true;
  }
  try {
    // Test if current token works by making a simple API call
    await spotifyApi.currentUser.profile();
    return false; // Token works, no auth needed
  } catch (error: any) {
    // If token expired and we have a refresh token, try to refresh
    if (refreshToken) {
      const clientId = process.env.SPOTIFY_CLIENT_ID!;
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
      try {
        const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          })
        });
        if (!refreshResponse.ok) {
          throw new Error(`Refresh token failed: ${refreshResponse.statusText}`);
        }
        const tokenData = await refreshResponse.json();
        // Update access token and Spotify API instance
        spotifyApi = SpotifyApi.withAccessToken(clientId, tokenData);
        isAuthenticated = true;
        // If a new refresh token is provided, update it
        if (tokenData.refresh_token) {
          refreshToken = tokenData.refresh_token;
        }
        // Try the API call again
        await spotifyApi.currentUser.profile();
        return false;
      } catch (refreshError) {
        console.log("Failed to refresh token, need to re-authenticate");
        isAuthenticated = false;
        spotifyApi = null;
        refreshToken = null;
        return true;
      }
    } else {
      console.log("Token expired or invalid, need to re-authenticate");
      isAuthenticated = false;
      spotifyApi = null;
      return true; // Token doesn't work, need auth
    }
  }
}

// Perform authentication and wait for completion
export async function performAuthentication(): Promise<boolean> {
  console.log("Please visit /login in your browser to authenticate with Spotify.");
  // Wait for authentication to complete (polling)
  return new Promise<boolean>((resolve) => {
    const checkAuth = setInterval(async () => {
      if (isAuthenticated && spotifyApi) {
        clearInterval(checkAuth);
        resolve(true);
      }
    }, 1000);
    setTimeout(() => {
      clearInterval(checkAuth);
      if (!isAuthenticated) {
        resolve(false);
      }
    }, 5 * 60 * 1000); // 5 minutes timeout
  });
}

// Auto-authenticate when necessary
export async function ensureAuthenticated(): Promise<boolean> {
  if (await needsAuthentication()) {
    // Prevent multiple concurrent auth attempts
    if (pendingAuthPromise) {
      return await pendingAuthPromise;
    }
    
    pendingAuthPromise = performAuthentication();
    const result = await pendingAuthPromise;
    pendingAuthPromise = null;
    return result;
  }
  return true; // Already authenticated
}

// Check authentication status without waiting
export function isSpotifyAuthenticated(): boolean {
  return !!spotifyApi && isAuthenticated;
} 