import dotenv from 'dotenv';
import { URLSearchParams } from 'url';
import logger from './logger.js';

dotenv.config();

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
}

let tokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

export async function getAccessToken(): Promise<string> {
  // If we have a valid cached token, return it
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    logger.debug('Using cached access token', { 
      expiresIn: Math.round((tokenCache.expiresAt - Date.now()) / 1000) + ' seconds' 
    });
    return tokenCache.accessToken;
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const authUrl = process.env.AUTH_URL;

  if (!clientId || !clientSecret || !authUrl) {
    logger.error('Missing required OAuth environment variables', {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasAuthUrl: Boolean(authUrl),
    });
    throw new Error('Missing OAuth credentials in environment variables');
  }

  logger.info('Fetching new access token...', { authUrl });
  
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to obtain access token', {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorText,
        authUrl: authUrl
      });
      throw new Error(`Failed to obtain access token: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as TokenResponse;
    
    // Validate the token response
    if (!data.access_token) {
      logger.error('Invalid token response - missing access_token', { data });
      throw new Error('Invalid token response: missing access_token');
    }
    
    // Log token details without exposing the token itself
    logger.info('Successfully obtained new access token', {
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      hasRefreshToken: Boolean(data.refresh_token),
      tokenLength: data.access_token.length
    });
    
    // Cache the token with a buffer time of 60 seconds
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    
    return data.access_token;
  } catch (error) {
    logger.error('Error fetching access token', { 
      error: error instanceof Error ? error.message : String(error),
      authUrl: authUrl
    });
    throw error;
  }
}