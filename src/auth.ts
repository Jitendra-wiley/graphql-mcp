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
    return tokenCache.accessToken;
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const authUrl = process.env.AUTH_URL;

  if (!clientId || !clientSecret || !authUrl) {
    throw new Error('Missing OAuth credentials in environment variables');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);

  try {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to obtain access token: ${response.status} ${errorText}`);
    }

    const data = await response.json() as TokenResponse;
    
    // Cache the token with a buffer time of 60 seconds
    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    
    return data.access_token;
  } catch (error) {
    logger.error('Error fetching access token', error);
    throw error;
  }
}