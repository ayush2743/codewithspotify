// HTML template functions for authentication pages

export const getAuthPageHTML = () => `
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
      .auth-btn {
        display: inline-block;
        margin-top: 20px;
        padding: 14px 36px;
        font-size: 1.15rem;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(90deg, #1db954 0%, #1ed760 100%);
        border: none;
        border-radius: 30px;
        box-shadow: 0 4px 16px rgba(29,185,84,0.15);
        cursor: pointer;
        text-decoration: none;
        transition: background 0.2s, transform 0.2s;
      }
      .auth-btn:hover {
        background: linear-gradient(90deg, #1ed760 0%, #1db954 100%);
        transform: translateY(-2px) scale(1.03);
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
      <p>To continue, please authenticate your Spotify account.</p>
      <a class="auth-btn" href="%AUTH_URL%">Click here to authenticate with Spotify</a>
      <div class="footer">
        <p>You will be redirected to Spotify to log in and authorize access.</p>
      </div>
    </div>
  </body>
</html>
`;

export const getSuccessPageHTML = () => `
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

export const getErrorPageHTML = (error: string, icon: string = "❌") => `
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