import { Request, Response } from "express";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import dotenv from "dotenv";

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

// HTML Templates
const getAuthPageHTML = () => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spotify Authentication</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #191414 0%, #1db954 100%);
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .container {
        background: rgba(25, 20, 20, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(29, 185, 84, 0.2);
        max-width: 500px;
        width: 100%;
      }
      
      .spotify-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        color: #1db954;
      }
      
      h1 {
        font-size: 2.2rem;
        margin-bottom: 15px;
        font-weight: 700;
        background: linear-gradient(45deg, #1db954, #1ed760);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      p {
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 15px;
        color: #b3b3b3;
      }
      
      .highlight {
        color: #1db954;
        font-weight: 600;
      }
      
      .loading {
        display: inline-block;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .footer {
        margin-top: 30px;
        font-size: 0.9rem;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="spotify-icon">🎵</div>
      <h1>Spotify Authentication</h1>
      <p>Please complete the authorization in the <span class="highlight">opened browser window</span>.</p>
      <p class="loading">Waiting for authorization...</p>
      <div class="footer">
        <p>You can close this tab once you see the success message.</p>
      </div>
    </div>
  </body>
</html>
`;

const getSuccessPageHTML = () => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #191414 0%, #1db954 100%);
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .container {
        background: rgba(25, 20, 20, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(29, 185, 84, 0.2);
        max-width: 500px;
        width: 100%;
      }
      
      .success-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        color: #1db954;
        animation: bounce 1s ease-in-out;
      }
      
      h1 {
        font-size: 2.2rem;
        margin-bottom: 15px;
        font-weight: 700;
        background: linear-gradient(45deg, #1db954, #1ed760);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      p {
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 15px;
        color: #b3b3b3;
      }
      
      .highlight {
        color: #1db954;
        font-weight: 600;
      }
      
      .success-message {
        background: rgba(29, 185, 84, 0.1);
        border: 1px solid rgba(29, 185, 84, 0.3);
        border-radius: 10px;
        padding: 20px;
        margin: 20px 0;
        color: #86efac;
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      
      .footer {
        margin-top: 30px;
        font-size: 0.9rem;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="success-icon">🎉</div>
      <h1>Authentication Successful!</h1>
      <div class="success-message">
        <p>You can now close this window and return to the application.</p>
        <p class="highlight">Your Spotify integration is now active.</p>
      </div>
      <div class="footer">
        <p>Ready to rock! 🎵</p>
      </div>
    </div>
  </body>
</html>
`;

const getErrorPageHTML = (error: string, icon: string = "❌") => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Failed</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, #191414 0%, #dc2626 100%);
        color: #ffffff;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .container {
        background: rgba(25, 20, 20, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(220, 38, 38, 0.2);
        max-width: 500px;
        width: 100%;
      }
      
      .error-icon {
        font-size: 4rem;
        margin-bottom: 20px;
        color: #dc2626;
      }
      
      h1 {
        font-size: 2.2rem;
        margin-bottom: 15px;
        font-weight: 700;
        color: #dc2626;
      }
      
      p {
        font-size: 1.1rem;
        line-height: 1.6;
        margin-bottom: 15px;
        color: #b3b3b3;
      }
      
      .error-message {
        background: rgba(220, 38, 38, 0.1);
        border: 1px solid rgba(220, 38, 38, 0.3);
        border-radius: 10px;
        padding: 15px;
        margin: 20px 0;
        color: #fca5a5;
        font-family: monospace;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="error-icon">${icon}</div>
      <h1>Authentication Failed</h1>
      <p>Error:</p>
      <div class="error-message">${error}</div>
      <p>Please close this window and try again.</p>
    </div>
  </body>
</html>
`;

// Step 1: Request User Authorization (as per Spotify docs)
export const loginHandler = async (req: Request, res: Response) => {
  try {
    const { default: open } = await import("open");

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

    await open(authUrl);
    res.send(getAuthPageHTML());
  } catch (error) {
    console.error("Error opening login:", error);
    res.status(500).send(getErrorPageHTML(`Error opening login: ${error}`));
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
  } catch (error) {
    console.log("Token expired or invalid, need to re-authenticate");
    isAuthenticated = false;
    spotifyApi = null;
    return true; // Token doesn't work, need auth
  }
}

// Perform authentication and wait for completion
export async function performAuthentication(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    console.log("Starting authentication process...");
    
    // Check for completion every second
    const checkAuth = setInterval(async () => {
      if (isAuthenticated && spotifyApi) {
        clearInterval(checkAuth);
        console.log("Authentication completed successfully");
        resolve(true);
      }
    }, 1000);

    // Timeout after 5 minutes
    setTimeout(() => {
      clearInterval(checkAuth);
      if (!isAuthenticated) {
        console.log("Authentication timed out");
        resolve(false);
      }
    }, 5 * 60 * 1000); // 5 minutes timeout

    // Open browser for authentication
    import("open").then(({ default: open }) => {
      open("http://localhost:3000/login").catch((error) => {
        console.log("Failed to open browser automatically. Please visit: http://localhost:3000/login");
      });
    });
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