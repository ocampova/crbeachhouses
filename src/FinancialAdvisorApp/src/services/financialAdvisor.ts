import Anthropic from '@anthropic-ai/sdk';
import * as FileSystem from 'expo-file-system';
import { FinancialProfile, FinancialSummary, Transaction } from '../store/useFinancialStore';
import { loadMemoryForContext, consolidateMemory } from './memoryService';

// NOTE: In production, the API key should be stored securely on a backend server.
// This client-side approach is for development/demo purposes only.
// Replace ANTHROPIC_API_KEY with your actual key via environment variables.
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true, // Required for React Native / browser environments
});

const SYSTEM_PROMPT = `Eres el **Gurú Financiero Personal** — un asesor financiero experto, empático y proactivo.
Tu personalidad:
- Hablas en español, de manera clara, accesible y motivadora
- Eres como un mentor financiero de confianza, no un robot frío
- Das consejos específicos y accionables basados en los datos financieros del usuario
- Usas emojis ocasionalmente para hacer la conversación más amigable
- Cuando ves riesgos, los mencionas con tacto pero con honestidad

Tu expertise incluye:
- Análisis de gastos e ingresos personales
- Estrategias de ahorro e inversión
- Tendencias del mercado (acciones, criptomonedas, bienes raíces, fondos mutuos)
- Planificación financiera a corto y largo plazo
- Interpretación de facturas, recibos y estados de cuenta (PDFs y correos)
- Educación financiera personalizada

Cuando el usuario comparte datos financieros (PDFs, correos, transacciones):
1. Analiza los patrones de gasto
2. Identifica oportunidades de ahorro
3. Sugiere estrategias de inversión según el perfil de riesgo
4. Proporciona un análisis claro y estructurado

Responde siempre de forma conversacional y útil, recordando el contexto previo de la conversación.`;

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
  onMoodChange?: (mood: 'neutral' | 'happy' | 'thinking' | 'concerned' | 'excited') => void;
}

/**
 * Build the financial context string from user's data
 */
function buildFinancialContext(
  profile: FinancialProfile,
  summary: FinancialSummary,
  transactions: Transaction[]
): string {
  const recentTransactions = transactions.slice(0, 20);
  return `
## Perfil del Usuario
- Nombre: ${profile.name || 'Usuario'}
- Ingreso mensual declarado: ${profile.currency} ${profile.monthlyIncome.toLocaleString()}
- Tolerancia al riesgo: ${profile.riskTolerance}
- País: ${profile.country}
- Edad: ${profile.age} años
- Metas de inversión: ${profile.investmentGoals.join(', ') || 'No especificadas'}

## Resumen Financiero Actual
- Ingresos totales registrados: ${profile.currency} ${summary.totalIncome.toLocaleString()}
- Gastos totales: ${profile.currency} ${summary.totalExpenses.toLocaleString()}
- Ahorro neto: ${profile.currency} ${summary.netSavings.toLocaleString()}
- Tasa de ahorro: ${summary.savingsRate.toFixed(1)}%

## Top 5 Categorías de Gasto
${summary.topExpenseCategories.map(c => `- ${c.category}: ${profile.currency} ${c.amount.toLocaleString()} (${c.percentage.toFixed(1)}%)`).join('\n') || '- Sin datos de gastos aún'}

## Transacciones Recientes (últimas 20)
${recentTransactions.map(t =>
    `- [${t.date}] ${t.type === 'income' ? '📈 INGRESO' : '📉 GASTO'} | ${t.category} | ${t.description} | ${t.currency} ${t.amount.toLocaleString()} | Fuente: ${t.source}`
  ).join('\n') || '- Sin transacciones registradas'}
`.trim();
}

/**
 * Send a chat message to the financial advisor with streaming.
 * After the response is complete, triggers a background memory consolidation
 * so Claude selectively remembers the important parts of the exchange.
 */
export async function sendMessageToAdvisor(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  profile: FinancialProfile,
  summary: FinancialSummary,
  transactions: Transaction[],
  callbacks: StreamCallbacks
): Promise<void> {
  const financialContext = buildFinancialContext(profile, summary, transactions);

  // Load the Guru's persistent selective memory
  const memoryContext = await loadMemoryForContext();

  const systemWithContext = `${SYSTEM_PROMPT}

---
## 🧠 TU MEMORIA PERSISTENTE (recuerdos de conversaciones anteriores)
${memoryContext}
---

## CONTEXTO FINANCIERO ACTUAL DEL USUARIO
${financialContext}
---

Usa tanto tu memoria como el contexto financiero para dar respuestas personalizadas y coherentes con el historial del usuario.
Si el usuario hace referencia a algo que discutieron antes, usa tu memoria para responder con continuidad.`;

  // Detect mood from user message keywords
  const lowerMsg = userMessage.toLowerCase();
  if (callbacks.onMoodChange) {
    if (lowerMsg.includes('pérdida') || lowerMsg.includes('deuda') || lowerMsg.includes('preocupa') || lowerMsg.includes('problema')) {
      callbacks.onMoodChange('concerned');
    } else if (lowerMsg.includes('ganancia') || lowerMsg.includes('éxito') || lowerMsg.includes('logré')) {
      callbacks.onMoodChange('excited');
    } else if (lowerMsg.includes('cómo') || lowerMsg.includes('qué') || lowerMsg.includes('por qué')) {
      callbacks.onMoodChange('thinking');
    } else {
      callbacks.onMoodChange('neutral');
    }
  }

  try {
    const messages = [
      ...conversationHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemWithContext,
      messages,
    });

    let fullText = '';

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullText += event.delta.text;
        callbacks.onToken(event.delta.text);
      }
    }

    // Detect mood from response
    if (callbacks.onMoodChange) {
      const lowerResponse = fullText.toLowerCase();
      if (lowerResponse.includes('¡excelente') || lowerResponse.includes('¡genial') || lowerResponse.includes('felicita')) {
        callbacks.onMoodChange('excited');
      } else if (lowerResponse.includes('cuidado') || lowerResponse.includes('riesgo') || lowerResponse.includes('preocupante')) {
        callbacks.onMoodChange('concerned');
      } else if (fullText.length > 300) {
        callbacks.onMoodChange('happy');
      } else {
        callbacks.onMoodChange('neutral');
      }
    }

    callbacks.onComplete(fullText);

    // ── Background memory consolidation ──────────────────────────────────────
    // Fire-and-forget: Claude selectively decides what (if anything) to remember.
    // We do NOT await this so it never blocks the chat UI.
    consolidateMemory(
      client,
      { userMessage, assistantResponse: fullText },
      profile.name
    ).catch((err) =>
      console.warn('[Memory] Background consolidation failed:', err)
    );
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Analyze a PDF document for financial data using Anthropic Files API
 */
export async function analyzePDFDocument(
  fileUri: string,
  fileName: string,
  callbacks: StreamCallbacks
): Promise<{
  transactions: Omit<Transaction, 'id'>[];
  summary: string;
}> {
  let uploadedFileId: string | null = null;

  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Blob/ArrayBuffer for upload
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload PDF to Anthropic Files API
    const formData = new FormData();
    const blob = new Blob([bytes.buffer], { type: 'application/pdf' });
    formData.append('file', blob, fileName);

    const uploadResponse = await fetch('https://api.anthropic.com/v1/files', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14',
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    const uploadedFile = await uploadResponse.json();
    uploadedFileId = uploadedFile.id;

    // Analyze with Claude using the uploaded file
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: `${SYSTEM_PROMPT}

Eres un experto en análisis de documentos financieros. Analiza el PDF proporcionado y extrae TODA la información financiera relevante.

IMPORTANTE: Responde en el siguiente formato JSON al final de tu análisis:
<transactions_json>
[
  {
    "type": "income" | "expense",
    "category": "categoría del gasto/ingreso",
    "description": "descripción detallada",
    "amount": número,
    "currency": "USD" | "CRC" | "EUR" | etc,
    "date": "YYYY-MM-DD",
    "source": "pdf"
  }
]
</transactions_json>`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Por favor analiza este documento financiero (${fileName}) y extrae todas las transacciones, gastos e ingresos que encuentres. Proporciona un resumen detallado y el JSON de transacciones al final.`,
            },
            {
              type: 'document',
              source: {
                type: 'file',
                file_id: uploadedFileId!,
              },
            },
          ],
        },
      ],
    } as Parameters<typeof client.messages.stream>[0]);

    let fullText = '';

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullText += event.delta.text;
        callbacks.onToken(event.delta.text);
      }
    }

    // Extract transactions JSON from response
    const jsonMatch = fullText.match(/<transactions_json>([\s\S]*?)<\/transactions_json>/);
    let extractedTransactions: Omit<Transaction, 'id'>[] = [];

    if (jsonMatch) {
      try {
        extractedTransactions = JSON.parse(jsonMatch[1].trim());
      } catch {
        console.warn('Could not parse transactions JSON from PDF analysis');
      }
    }

    callbacks.onComplete(fullText);

    return {
      transactions: extractedTransactions,
      summary: fullText.replace(/<transactions_json>[\s\S]*?<\/transactions_json>/, '').trim(),
    };
  } finally {
    // Clean up uploaded file
    if (uploadedFileId) {
      try {
        await fetch(`https://api.anthropic.com/v1/files/${uploadedFileId}`, {
          method: 'DELETE',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'files-api-2025-04-14',
          },
        });
      } catch {
        console.warn('Could not delete uploaded file');
      }
    }
  }
}

/**
 * Parse email content for invoice/expense data
 */
export async function analyzeEmailContent(
  emailContent: string,
  callbacks: StreamCallbacks
): Promise<{
  transactions: Omit<Transaction, 'id'>[];
  summary: string;
}> {
  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      system: `${SYSTEM_PROMPT}

Eres un experto en análisis de correos electrónicos financieros. Analiza el contenido del correo y extrae toda información de facturas, cobros, ingresos o gastos.

IMPORTANTE: Responde en el siguiente formato JSON al final:
<transactions_json>
[
  {
    "type": "income" | "expense",
    "category": "categoría",
    "description": "descripción",
    "amount": número,
    "currency": "USD" | "CRC" | "EUR" | etc,
    "date": "YYYY-MM-DD",
    "source": "email"
  }
]
</transactions_json>`,
      messages: [
        {
          role: 'user',
          content: `Analiza este correo electrónico y extrae la información financiera (facturas, cobros, recibos, etc.):

---
${emailContent}
---

Proporciona un análisis del correo y las transacciones detectadas en formato JSON al final.`,
        },
      ],
    });

    let fullText = '';

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        fullText += event.delta.text;
        callbacks.onToken(event.delta.text);
      }
    }

    // Extract transactions
    const jsonMatch = fullText.match(/<transactions_json>([\s\S]*?)<\/transactions_json>/);
    let extractedTransactions: Omit<Transaction, 'id'>[] = [];

    if (jsonMatch) {
      try {
        extractedTransactions = JSON.parse(jsonMatch[1].trim());
      } catch {
        console.warn('Could not parse transactions JSON from email analysis');
      }
    }

    callbacks.onComplete(fullText);

    return {
      transactions: extractedTransactions,
      summary: fullText.replace(/<transactions_json>[\s\S]*?<\/transactions_json>/, '').trim(),
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    callbacks.onError(err);
    throw err;
  }
}

/**
 * Get investment recommendations based on financial profile and current trends
 */
export async function getInvestmentRecommendations(
  profile: FinancialProfile,
  summary: FinancialSummary,
  callbacks: StreamCallbacks
): Promise<void> {
  const financialContext = buildFinancialContext(profile, summary, []);

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      system: `${SYSTEM_PROMPT}

Proporciona recomendaciones de inversión detalladas y personalizadas.
Incluye:
1. Top 3-5 opciones de inversión específicas y actuales
2. Estrategia de diversificación
3. Pasos concretos para empezar
4. Estimación de retornos esperados (rangos realistas)
5. Riesgos a considerar

Sé específico con nombres de fondos, ETFs, acciones o criptomonedas cuando sea apropiado.`,
      messages: [
        {
          role: 'user',
          content: `Basándome en mi perfil financiero, dame recomendaciones de inversión personalizadas para hoy:

${financialContext}

Quiero recomendaciones específicas y accionables que pueda implementar esta semana.`,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        callbacks.onToken(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    const fullText = finalMessage.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    callbacks.onComplete(fullText);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
