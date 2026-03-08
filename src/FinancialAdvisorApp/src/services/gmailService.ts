import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

WebBrowser.maybeCompleteAuthSession();

// Gmail OAuth Configuration
// Replace with your actual Google OAuth credentials from Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const REDIRECT_URI = Linking.createURL('/auth/google');

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'openid',
  'email',
].join(' ');

export interface GmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  snippet: string;
}

/**
 * Initiate Gmail OAuth flow
 */
export async function authenticateWithGmail(): Promise<GmailTokens | null> {
  const authUrl = buildGmailAuthUrl();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

  if (result.type === 'success' && result.url) {
    const code = extractCodeFromUrl(result.url);
    if (code) {
      return exchangeCodeForTokens(code);
    }
  }
  return null;
}

function buildGmailAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function extractCodeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

async function exchangeCodeForTokens(code: string): Promise<GmailTokens | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!response.ok) {
      console.error('Token exchange failed:', await response.text());
      return null;
    }

    const data = await response.json();
    const tokens: GmailTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };

    await AsyncStorage.setItem('gmail_tokens', JSON.stringify(tokens));
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}

async function getValidToken(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem('gmail_tokens');
    if (!stored) return null;

    const tokens: GmailTokens = JSON.parse(stored);

    // Check if token is still valid (with 5 min buffer)
    if (tokens.expires_at - 5 * 60 * 1000 > Date.now()) {
      return tokens.access_token;
    }

    // Try to refresh if we have a refresh token
    if (tokens.refresh_token) {
      return refreshAccessToken(tokens.refresh_token);
    }

    return null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const stored = await AsyncStorage.getItem('gmail_tokens');
    if (stored) {
      const tokens: GmailTokens = JSON.parse(stored);
      tokens.access_token = data.access_token;
      tokens.expires_at = Date.now() + data.expires_in * 1000;
      await AsyncStorage.setItem('gmail_tokens', JSON.stringify(tokens));
    }

    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Fetch financial-related emails from Gmail
 */
export async function fetchFinancialEmails(maxResults = 20): Promise<EmailMessage[]> {
  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated with Gmail');

  // Search for financial emails: invoices, receipts, bank notifications, etc.
  const query = 'subject:(factura OR recibo OR pago OR cobro OR invoice OR receipt OR "estado de cuenta" OR "transferencia" OR "transacción") newer_than:3m';

  const searchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!searchResponse.ok) {
    throw new Error(`Gmail search failed: ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();
  const messageIds: string[] = (searchData.messages || []).map((m: { id: string }) => m.id);

  if (messageIds.length === 0) return [];

  // Fetch full email details
  const emails = await Promise.all(
    messageIds.map((id) => fetchEmailById(id, token))
  );

  return emails.filter((e): e is EmailMessage => e !== null);
}

async function fetchEmailById(
  messageId: string,
  token: string
): Promise<EmailMessage | null> {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const headers = data.payload?.headers || [];

    const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '(Sin asunto)';
    const from = headers.find((h: { name: string }) => h.name === 'From')?.value || '';
    const date = headers.find((h: { name: string }) => h.name === 'Date')?.value || '';

    const body = extractEmailBody(data.payload);

    return {
      id: messageId,
      subject,
      from,
      date: formatEmailDate(date),
      body,
      snippet: data.snippet || '',
    };
  } catch {
    return null;
  }
}

function extractEmailBody(payload: {
  body?: { data?: string };
  parts?: { mimeType: string; body?: { data?: string }; parts?: unknown[] }[];
  mimeType?: string;
}): string {
  if (!payload) return '';

  // Simple text/plain
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  // Multipart - look for text/plain or text/html
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return stripHtmlTags(decodeBase64Url(part.body.data));
      }
    }
  }

  return '';
}

function decodeBase64Url(encoded: string): string {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    return atob(base64);
  } catch {
    return '';
  }
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatEmailDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Check if user is authenticated with Gmail
 */
export async function isGmailAuthenticated(): Promise<boolean> {
  const token = await getValidToken();
  return token !== null;
}

/**
 * Sign out from Gmail
 */
export async function signOutFromGmail(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('gmail_tokens');
    if (stored) {
      const tokens: GmailTokens = JSON.parse(stored);
      // Revoke token
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`,
        { method: 'POST' }
      );
    }
  } catch {
    // Ignore errors during sign out
  } finally {
    await AsyncStorage.removeItem('gmail_tokens');
  }
}
