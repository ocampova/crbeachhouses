/**
 * Guru Memory Service
 *
 * Implements the Anthropic Memory Tool (memory_20250818) with AsyncStorage as the
 * persistent backend. Claude drives every read/write decision — the service only
 * executes the operations Claude requests, ensuring truly selective memory.
 *
 * Memory file structure stored in AsyncStorage:
 *   memory_file:/memories/perfil.md         ← persistent user profile insights
 *   memory_file:/memories/ideas_clave.md    ← key financial ideas and decisions
 *   memory_file:/memories/metas.md          ← goals and milestones
 *   memory_file:/memories/preocupaciones.md ← risks and concerns flagged
 *   memory_file:/memories/preferencias.md  ← communication preferences
 *
 * The Memory Tool protocol:
 *   view   path=/memories/       → list all files in the directory
 *   view   path=/memories/X.md  → read file contents
 *   create path=…  file_text=…  → create or overwrite a file
 *   str_replace path=… old_str=… new_str=… → surgical edit
 *   insert path=… insert_line=N new_str=… → insert after line N
 *   delete path=…               → delete a file
 *   rename path=… new_path=…   → rename / move
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Anthropic from '@anthropic-ai/sdk';

// ─── Storage keys ────────────────────────────────────────────────────────────

const FILE_PREFIX = 'memory_file:';
const MEMORY_DIR = '/memories/';
const META_KEY = 'memory_meta'; // last consolidation time, stats

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryMeta {
  lastConsolidation: string | null; // ISO date
  totalConsolidations: number;
  fileCount: number;
}

export interface MemoryFile {
  path: string;
  content: string;
  updatedAt: string;
}

// ─── Low-level file storage ───────────────────────────────────────────────────

async function listFiles(): Promise<MemoryFile[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const memoryKeys = allKeys.filter((k) => k.startsWith(FILE_PREFIX));
    if (memoryKeys.length === 0) return [];

    const pairs = await AsyncStorage.multiGet(memoryKeys);
    return pairs
      .filter((p): p is [string, string] => p[1] !== null)
      .map(([key, raw]) => JSON.parse(raw) as MemoryFile);
  } catch {
    return [];
  }
}

async function readFile(path: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(FILE_PREFIX + path);
    if (!raw) return null;
    return (JSON.parse(raw) as MemoryFile).content;
  } catch {
    return null;
  }
}

async function writeFile(path: string, content: string): Promise<void> {
  const file: MemoryFile = { path, content, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(FILE_PREFIX + path, JSON.stringify(file));
}

async function deleteFile(path: string): Promise<void> {
  await AsyncStorage.removeItem(FILE_PREFIX + path);
}

// ─── Memory Tool command executor ────────────────────────────────────────────

/**
 * Executes a single memory tool command (called in the agentic loop).
 * Returns the string result to send back as a tool_result.
 */
export async function executeMemoryCommand(
  input: Record<string, unknown>
): Promise<string> {
  const command = input.command as string;
  const path = (input.path as string) ?? '';

  switch (command) {
    // ── view ──────────────────────────────────────────────────────────────────
    case 'view': {
      // Directory listing
      if (path.endsWith('/') || path === MEMORY_DIR.slice(0, -1)) {
        const files = await listFiles();
        if (files.length === 0) {
          return 'El directorio /memories/ está vacío. Aún no hay recuerdos guardados.';
        }
        const listing = files
          .map((f) => `  ${f.path}  (actualizado: ${f.updatedAt.substring(0, 10)})`)
          .join('\n');
        return `Archivos en /memories/:\n${listing}`;
      }
      // File read
      const content = await readFile(path);
      if (content === null) {
        return `Error: archivo "${path}" no encontrado.`;
      }
      return content;
    }

    // ── create ────────────────────────────────────────────────────────────────
    case 'create': {
      const fileText = (input.file_text as string) ?? '';
      await writeFile(path, fileText);
      return `Archivo "${path}" creado/actualizado exitosamente.`;
    }

    // ── str_replace ───────────────────────────────────────────────────────────
    case 'str_replace': {
      const oldStr = (input.old_str as string) ?? '';
      const newStr = (input.new_str as string) ?? '';
      const existing = await readFile(path);
      if (existing === null) {
        return `Error: archivo "${path}" no encontrado.`;
      }
      if (!existing.includes(oldStr)) {
        return `Error: el texto a reemplazar no se encontró en "${path}".`;
      }
      const updated = existing.replace(oldStr, newStr);
      await writeFile(path, updated);
      return `"${path}" actualizado correctamente.`;
    }

    // ── insert ────────────────────────────────────────────────────────────────
    case 'insert': {
      const insertLine = Number(input.insert_line ?? 0);
      const newStr = (input.new_str as string) ?? '';
      const existing = await readFile(path);
      if (existing === null) {
        return `Error: archivo "${path}" no encontrado.`;
      }
      const lines = existing.split('\n');
      lines.splice(insertLine, 0, newStr);
      await writeFile(path, lines.join('\n'));
      return `Texto insertado en "${path}" en la línea ${insertLine}.`;
    }

    // ── delete ────────────────────────────────────────────────────────────────
    case 'delete': {
      await deleteFile(path);
      return `Archivo "${path}" eliminado.`;
    }

    // ── rename ────────────────────────────────────────────────────────────────
    case 'rename': {
      const newPath = (input.new_path as string) ?? '';
      const content = await readFile(path);
      if (content === null) {
        return `Error: archivo "${path}" no encontrado.`;
      }
      await writeFile(newPath, content);
      await deleteFile(path);
      return `Archivo renombrado de "${path}" a "${newPath}".`;
    }

    default:
      return `Error: comando de memoria desconocido "${command}".`;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the memory tool definition for the Anthropic API.
 */
export const MEMORY_TOOL_DEFINITION = {
  type: 'memory_20250818' as const,
  name: 'memory' as const,
};

/**
 * Load all memory files and return them as a formatted string to inject
 * into the system prompt, so the Guru always "remembers" important things.
 */
export async function loadMemoryForContext(): Promise<string> {
  const files = await listFiles();
  if (files.length === 0) {
    return '(Memoria vacía — aún no hay recuerdos guardados de conversaciones anteriores)';
  }

  const sections = await Promise.all(
    files.map(async (f) => {
      const content = await readFile(f.path);
      const fileName = f.path.split('/').pop() ?? f.path;
      return `### 📄 ${fileName}\n${content ?? '(vacío)'}`;
    })
  );

  return sections.join('\n\n---\n\n');
}

/**
 * Run a selective memory consolidation after a conversation exchange.
 *
 * Claude is given the last user/assistant exchange and its memory tool.
 * It decides autonomously what (if anything) to remember, update or forget.
 *
 * This runs in the background — callers should NOT await it for UX purposes.
 */
export async function consolidateMemory(
  client: Anthropic,
  exchange: { userMessage: string; assistantResponse: string },
  userName: string
): Promise<void> {
  const CONSOLIDATION_SYSTEM = `Eres el Gurú Financiero Personal de ${userName || 'un usuario'}.
Tienes acceso a tu sistema de memoria persistente (/memories/).

Tu tarea ahora es **revisar y actualizar selectivamente tu memoria** basándote en el intercambio de conversación que se te proporciona.

## Reglas de memoria selectiva:
1. **Guarda SOLO información realmente importante** para futuras interacciones:
   - Decisiones financieras significativas tomadas por el usuario
   - Metas o cambios de metas expresados
   - Preocupaciones recurrentes o urgentes
   - Preferencias o datos de personalidad financiera
   - Hitos o logros destacados
   - Compromisos o planes de acción concretos

2. **NO guardes** conversación trivial, saludos, preguntas generales sin contexto personal, ni información ya conocida de la misma sesión.

3. **Organiza la memoria en archivos temáticos** dentro de /memories/:
   - perfil.md → Perfil, personalidad y contexto del usuario
   - ideas_clave.md → Ideas, consejos aceptados, decisiones tomadas
   - metas.md → Metas financieras y progreso
   - preocupaciones.md → Riesgos, deudas, problemas identificados
   - preferencias.md → Cómo le gusta que le hablen, qué le motiva

4. **Sé quirúrgico**: edita solo lo que cambió. Usa str_replace para actualizar entradas existentes. Solo crea archivos si es necesario.

5. Si el intercambio **no contiene nada memorable**, termina inmediatamente sin llamar ninguna herramienta.

Analiza el intercambio ahora y actúa:`;

  const exchangeContent = `## Intercambio de conversación a evaluar:

**Usuario dijo:**
${exchange.userMessage}

**Gurú respondió:**
${exchange.assistantResponse}

---
Ahora revisa tu memoria actual y actualiza solo lo que realmente vale la pena recordar.`;

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: exchangeContent },
    ];

    let continueLoop = true;
    let safetyCounter = 0; // prevent infinite loops

    while (continueLoop && safetyCounter < 8) {
      safetyCounter++;

      const response = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        system: CONSOLIDATION_SYSTEM,
        tools: [MEMORY_TOOL_DEFINITION],
        messages,
      });

      if (response.stop_reason === 'end_turn') {
        continueLoop = false;
        break;
      }

      if (response.stop_reason === 'tool_use') {
        // Append Claude's response to the conversation
        messages.push({ role: 'assistant', content: response.content });

        // Execute all memory tool calls
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use' || block.name !== 'memory') continue;

          const result = await executeMemoryCommand(
            block.input as Record<string, unknown>
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        if (toolResults.length > 0) {
          messages.push({ role: 'user', content: toolResults });
        } else {
          continueLoop = false;
        }
      } else {
        // pause_turn or unexpected — stop
        continueLoop = false;
      }
    }

    // Update meta
    await updateMemoryMeta();
  } catch (error) {
    // Consolidation is best-effort — silently log, never throw
    console.warn('[Memory] Consolidation error (non-fatal):', error);
  }
}

async function updateMemoryMeta(): Promise<void> {
  const files = await listFiles();
  const meta: MemoryMeta = {
    lastConsolidation: new Date().toISOString(),
    totalConsolidations: await getTotalConsolidations() + 1,
    fileCount: files.length,
  };
  await AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

async function getTotalConsolidations(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return 0;
    return (JSON.parse(raw) as MemoryMeta).totalConsolidations ?? 0;
  } catch {
    return 0;
  }
}

export async function getMemoryMeta(): Promise<MemoryMeta> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    if (!raw) return { lastConsolidation: null, totalConsolidations: 0, fileCount: 0 };
    return JSON.parse(raw) as MemoryMeta;
  } catch {
    return { lastConsolidation: null, totalConsolidations: 0, fileCount: 0 };
  }
}

export async function getAllMemoryFiles(): Promise<MemoryFile[]> {
  return listFiles();
}

export async function clearAllMemory(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const memoryKeys = allKeys.filter(
    (k) => k.startsWith(FILE_PREFIX) || k === META_KEY
  );
  await AsyncStorage.multiRemove(memoryKeys);
}

export async function deleteMemoryFile(path: string): Promise<void> {
  await deleteFile(path);
  await updateMemoryMeta();
}
