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


// Global map to store tokens and state per email
export interface UserTokenData {
  accessToken: any;
  refreshToken: string;
  state: string;
  isAuthenticated: boolean;
}

export const userTokens: Map<string, UserTokenData> = new Map();

// Step 1: Request User Authorization
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
    const email = req.query.email as string;
    if (!email) {
      res.status(400).send(getErrorPageHTML("Missing email parameter in login URL."));
      return;
    }
    const state = generateRandomString(16);
    // Store state for this email
    userTokens.set(email, {
      accessToken: null,
      refreshToken: '',
      state,
      isAuthenticated: false,
    });
    const authUrl = 'https://accounts.spotify.com/authorize?' +
      new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scopes.join(' '),
        redirect_uri: redirectUri,
        state: `${email}:${state}`,
        show_dialog: 'true'
      }).toString();
    res.send(getAuthPageHTML().replace("%AUTH_URL%", authUrl));
  } catch (error) {
    console.error("Error generating login URL:", error);
    res.status(500).send(getErrorPageHTML(`Error generating login URL: ${error}`));
  }
};

// Step 2: Handle the callback and exchange code for access token
export const callbackHandler = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const stateParam = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    console.error("Authorization error:", error);
    res.status(400).send(getErrorPageHTML(`Authorization failed: ${error}`));
    return;
  }

  if (!stateParam || !stateParam.includes(":")) {
    res.status(400).send(getErrorPageHTML("State/email missing or malformed."));
    return;
  }
  const [email, state] = stateParam.split(":");
  const userData = userTokens.get(email);
  if (!userData || userData.state !== state) {
    res.status(400).send(getErrorPageHTML("State verification failed.", "🔒"));
    return;
  }
  if (!code) {
    res.status(400).send(getErrorPageHTML("No authorization code received.", "⚠️"));
    return;
  }
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;
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
    userTokens.set(email, {
      accessToken: tokenData,
      refreshToken: tokenData.refresh_token,
      state,
      isAuthenticated: true,
    });
    res.send(getSuccessPageHTML());
    console.log(`Spotify authenticated successfully for ${email}`);

    console.log("-------------------------------- ");
    console.log(userTokens);
    console.log("-------------------------------- ");

    
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    res.status(500).send(getErrorPageHTML(`Failed to exchange authorization code for tokens: ${(error as Error).message}`, "💥"));
  }
};

// Refresh access token if needed (per email)
export const refreshAccessToken = async (email: string): Promise<boolean> => {
  const userData = userTokens.get(email);
  if (!userData || !userData.refreshToken) return false;
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: userData.refreshToken
      })
    });
    if (!refreshResponse.ok) {
      throw new Error(`Refresh token failed: ${refreshResponse.statusText}`);
    }
    const tokenData = await refreshResponse.json();
    userTokens.set(email, {
      ...userData,
      accessToken: tokenData,
      refreshToken: tokenData.refresh_token || userData.refreshToken,
      isAuthenticated: true,
    });
    return true;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    userTokens.set(email, { ...userData!, isAuthenticated: false });
    return false;
  }
};

// Check authentication status (per email)
export function isSpotifyAuthenticated(email: string): boolean {
  const userData = userTokens.get(email);
  return !!userData && userData.isAuthenticated && !!userData.accessToken;
}

// Get SpotifyApi instance for a user
export function getSpotifyApiForUser(email: string) {
  const userData = userTokens.get(email);
  if (!userData || !userData.accessToken) return null;
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  return SpotifyApi.withAccessToken(clientId, userData.accessToken);
} 