# 🧙 Gurú Financiero Personal

Aplicación móvil de asesoría financiera con inteligencia artificial, avatar animado y análisis automático de gastos desde PDFs y correos electrónicos.

## ✨ Características

### 🧙 Avatar Inteligente
- Avatar animado con expresiones emocionales (feliz, pensativo, preocupado, emocionado)
- Animaciones de parpadeo, movimiento de boca al "hablar" y oscilación continua
- Cambia de humor según el contexto de la conversación

### 💬 Chat con IA (Claude Opus 4.6)
- Conversación en tiempo real con streaming de respuestas
- Contexto financiero personalizado en cada consulta
- Memoria de la conversación (últimas 50 interacciones)
- Prompts rápidos para consultas frecuentes

### 📄 Análisis de PDFs
- Carga estados de cuenta, facturas o recibos en PDF
- Extracción automática de transacciones usando **Anthropic Files API**
- Importación masiva de gastos con un solo click

### 📧 Integración con Correos
- **Conexión directa con Gmail** via OAuth 2.0
- Búsqueda automática de correos financieros (facturas, cobros, recibos)
- **Análisis manual** pegando el contenido de cualquier correo
- Extracción inteligente de montos, fechas y categorías

### 💰 Gestión Financiera
- Registro de ingresos y gastos con categorías
- Dashboard con resumen visual y gráficas de distribución
- Tendencia mensual de ingresos vs gastos
- Tasa de ahorro en tiempo real

### 📈 Portafolio de Inversiones
- Seguimiento de acciones, cripto, bienes raíces, bonos y fondos
- Cálculo automático de retornos y rendimiento
- **Recomendaciones personalizadas** generadas por IA según perfil de riesgo

### 👤 Perfil Personalizado
- Configuración de perfil de riesgo (conservador/moderado/agresivo)
- Metas de inversión seleccionables
- Datos locales encriptados (nunca se suben a ningún servidor)

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) o Android Studio

### Setup

```bash
# Clonar e ir al directorio
cd src/FinancialAdvisorApp

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# Iniciar la app
npm start
```

### Configuración de APIs

#### 1. Anthropic API Key
1. Ve a [console.anthropic.com](https://console.anthropic.com/)
2. Crea una API key
3. Agrega a `.env`: `EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...`

#### 2. Google OAuth (para Gmail)
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto y habilita la **Gmail API**
3. Crea credenciales OAuth 2.0:
   - Para iOS: tipo "iOS", bundle ID `com.gurufinanciero.app`
   - Para Android: tipo "Android", package `com.gurufinanciero.app`
4. Agrega a `.env`: `EXPO_PUBLIC_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com`

---

## 🏗️ Arquitectura

```
app/                    # Expo Router screens
├── _layout.tsx         # Tab navigation
├── index.tsx           # Home (chat con avatar)
├── finances.tsx        # Finanzas y documentos
├── investments.tsx     # Portafolio e inversiones
└── profile.tsx         # Perfil del usuario

src/
├── components/
│   ├── GuruAvatar.tsx      # Avatar SVG animado
│   ├── ChatBubble.tsx      # Burbujas de chat
│   ├── FinancialCard.tsx   # Tarjetas de métricas
│   └── LoadingDots.tsx     # Indicador de escritura
├── screens/
│   ├── HomeScreen.tsx      # Chat principal
│   ├── FinancesScreen.tsx  # Transacciones + PDF + Email
│   ├── InvestmentsScreen.tsx # Portafolio + Recomendaciones
│   └── ProfileScreen.tsx   # Configuración del usuario
├── services/
│   ├── financialAdvisor.ts # Claude API (chat, PDF, email, inversiones)
│   └── gmailService.ts     # Gmail OAuth + lectura de correos
├── store/
│   └── useFinancialStore.ts # Estado global (Zustand)
└── theme/
    └── colors.ts           # Paleta de colores
```

---

## 🔒 Privacidad y Seguridad

- **Todos los datos financieros** se guardan exclusivamente en el dispositivo (AsyncStorage)
- **Nunca** se envían datos personales a servidores propios
- Las llamadas a la API de Anthropic incluyen datos financieros para análisis — usa con datos reales solo si aceptas los [Términos de Anthropic](https://www.anthropic.com/legal/privacy)
- Para producción, se recomienda mover la API key a un backend propio

---

## 🛠️ Stack Tecnológico

| Tecnología | Uso |
|---|---|
| React Native + Expo 51 | Framework móvil |
| Expo Router | Navegación |
| TypeScript | Tipado estático |
| Zustand | Estado global |
| @anthropic-ai/sdk | Claude AI |
| Anthropic Files API | Análisis de PDFs |
| Gmail API | Lectura de correos |
| react-native-svg | Avatar vectorial |
| Animated API | Animaciones del avatar |
| AsyncStorage | Persistencia local |

---

## 📱 Capturas de Pantalla

### Chat con el Gurú
- Avatar animado que cambia expresión según el contexto
- Respuestas en tiempo real con streaming
- Botones de consultas rápidas

### Análisis de PDF
- Selección de documento desde el dispositivo
- Análisis automático con extracción de transacciones
- Confirmación antes de importar

### Gmail Integration
- Autenticación OAuth segura
- Lista de correos financieros detectados
- Análisis con un tap

### Portafolio
- Vista de todas las inversiones
- Retorno total y rendimiento porcentual
- Recomendaciones personalizadas de la IA
