
import { GoogleGenAI, Type } from "@google/genai";
import { Slide, AdProject, ContentIntent, VisualStyle, AspectRatio, BrandContext } from "../types";
import { STYLE_CONFIGS } from "../constants";

// Helper to wrap promises with a timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

// Helper to clean Markdown JSON significantly more robustly
const cleanJSON = (text: string) => {
  if (!text) return "{}";
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
};

// --- SAFE MODE FALLBACK ---
const getSafeFallback = (prompt: string, style: string, brand: BrandContext, type: string, slideCount: number = 6): any => {
  // Use brand context or extract from prompt as fallback
  const niche = brand.niche || prompt.split(/\s+/).slice(0, 4).join(' ') || "tu sector";
  const audience = brand.targetAudience || "tu audiencia";
  const subject = brand.name || niche;

  const allSlides = [
    {
      headline: `*${subject}*: La solución que necesitas`,
      subHeadline: `Descubre cómo ayudamos a ${audience} a lograr resultados extraordinarios con nuestro método probado.`,
      visualPrompt: `High-end professional atmosphere for ${niche}, professional lighting, premium aesthetic related to ${audience}`,
      layout: "centered",
      angleLabel: "GANCHO"
    },
    {
      headline: "El *Problema* de hoy",
      subHeadline: `Sabemos que como ${audience}, te enfrentas a retos diarios en ${niche} que frenan tu crecimiento.`,
      visualPrompt: `Metaphorical image about challenges in ${niche}, professional cinematic lighting`,
      layout: "bottom-heavy",
      angleLabel: "DOLOR"
    },
    {
      headline: "Nuestra *Solución*",
      subHeadline: `Hemos diseñado un sistema específico para ${niche} que elimina la complejidad y maximiza tu energía.`,
      visualPrompt: `Bright success imagery related to ${niche}, clean minimalist 4k`,
      layout: "centered",
      angleLabel: "SOLUCIÓN"
    },
    {
      headline: "Resultados *Reales*",
      subHeadline: `Únete a personas en ${niche} que ya han transformado su rendimiento con nuestra ayuda.`,
      visualPrompt: `Professional achievement in ${niche} context, warm lighting`,
      layout: "top-heavy",
      angleLabel: "PRUEBA"
    },
    {
      headline: "Tu Nueva *Realidad*",
      subHeadline: `Imagina trabajar en su salud y rendimiento con la confianza de tener el mejor respaldo en ${niche}.`,
      visualPrompt: `Inspirational setting for ${audience}, sunrise, hopeful professional vibe`,
      layout: "centered",
      angleLabel: "BENEFICIO"
    },
    {
      headline: "Accede *Ahora*",
      subHeadline: `No pierdas la oportunidad de elevar tu estándar. Haz clic para empezar tu cambio hoy.`,
      cta: "REGÍSTRATE AQUÍ",
      visualPrompt: `Dynamic abstract geometric composition, premium production for ${niche}`,
      layout: "bottom-heavy",
      angleLabel: "CIERRE"
    },
    {
      headline: "¿Por qué *Nosotros*?",
      subHeadline: `Más de 1,000 clientes en ${niche} ya confían en nosotros. Resultados comprobados, sin excusas.`,
      visualPrompt: `Trust and credibility imagery for ${niche}, professional studio lighting`,
      layout: "centered",
      angleLabel: "AUTORIDAD"
    },
    {
      headline: "El *Secreto* que cambia todo",
      subHeadline: `Lo que los líderes de ${niche} saben y aplican cada día. ¿Estás listo para saberlo?`,
      visualPrompt: `Mysterious reveal concept for ${niche}, dramatic cinematic lighting`,
      layout: "centered",
      angleLabel: "CURIOSIDAD"
    },
    {
      headline: "Casos de *Éxito* reales",
      subHeadline: `${audience} como tú lograron resultados extraordinarios en ${niche} en tiempo récord.`,
      visualPrompt: `Success celebration related to ${niche}, warm golden hour lighting`,
      layout: "top-heavy",
      angleLabel: "SOCIAL PROOF"
    },
    {
      headline: "Última *Oportunidad*",
      subHeadline: `Las plazas son limitadas y el precio sube pronto. Actúa ahora o pierde tu ventaja en ${niche}.`,
      cta: "RESERVAR MI LUGAR",
      visualPrompt: `Urgency concept for ${niche}, red and gold dramatic composition`,
      layout: "bottom-heavy",
      angleLabel: "URGENCIA"
    }
  ];

  const targetCount = type === 'single-image' ? 1 : Math.min(slideCount, allSlides.length);
  // If we need more slides than available templates, cycle through them
  const slides = Array.from({ length: targetCount }, (_, i) => allSlides[i % allSlides.length]);

  return {
    title: `Campaña: ${niche}`,
    designTheme: {
      primaryColor: "#0a0a0a",
      accentColor: "#facc15",
      headlineFont: "font-brand",
      subHeadlineFont: "font-modern"
    },
    slides
  };
};

export const getApiKey = () => {
  let key: string | null = null;
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
      key = import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) { }

  if (!key) {
    const v2 = typeof process !== 'undefined' ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY) : null;
    key = v2;
  }

  if (!key) {
    console.warn("API Key not found. Ensure GEMINI_API_KEY or VITE_GEMINI_API_KEY are set.");
  }
  return key;
};

export const enhancePrompt = async (rawPrompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: "models/gemini-2.0-flash",
      contents: [{ parts: [{ text: `Eres un experto en copywriting de respuesta directa y marketing de alto impacto. Optimiza el siguiente prompt de campaña publicitaria para que la IA genere mejores imágenes y textos de venta. REGLAS: (1) Mantén EXACTAMENTE el mismo objetivo de negocio. (2) Agrega contexto visual, emocional y de audiencia. (3) Sé específico con el nicho y el dolor del cliente. (4) El resultado DEBE estar en ESPAÑOL. (5) Devuelve SOLO el prompt optimizado, sin comentarios ni introducciones.\n\nPrompt original: "${rawPrompt}"` }] }],
    }),
    15000,
    "Enhance Prompt Timeout"
  );
  const result = response.text?.trim();
  if (!result) throw new Error("La IA no devolvió un prompt optimizado.");
  return result;
};

export const generateAdCopy = async (
  prompt: string,
  type: 'carousel' | 'single-image' | 'angles-batch' = 'carousel',
  intent: ContentIntent,
  style: VisualStyle,
  brandContext: BrandContext,
  styleReference?: string | string[],
  knowledgeBase?: string,
  characterReference?: string | string[],
  slideCount: number = 6
): Promise<any> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const isVolume = type === 'angles-batch';
  const targetSlides = type === 'single-image' ? 1 : (type === 'angles-batch' ? 6 : slideCount);

  let sysInstruction = `Rol: Director Creativo y Copywriter de Respuesta Directa de Élite, especializado en marketing de impacto y psicología de ventas de alto CTR.
  
  ## BRIEF CREATIVO
  El usuario ha proporcionado instrucciones específicas. Tu trabajo es CUMPLIRLAS AL PIE DE LA LETRA para los aspectos estructurales (número de slides, tema, producto, servicio, ángulos pedidos) y ELEVAR el copywriting a nivel profesional de respuesta directa.
  Si el usuario pide un número específico de slides, DEBES generar EXACTAMENTE ese número. Si pide slides sobre temas específicos, DEBES respetarlos. El brief del usuario es una ORDEN, no una sugerencia.

  ## CONTEXTO DE MARCA (OBLIGATORIO - PERSONALIZA TODO A ESTO):
  - Nombre de Marca: ${brandContext.name || '(sin nombre)'}
  - Sector/Nicho: ${brandContext.niche || '(sin nicho)'}
  - Público Objetivo: ${brandContext.targetAudience || '(audiencia general)'}
  - Tono de Voz: ${brandContext.tone || 'Profesional y Persuasivo'}
  ${brandContext.colorPalette ? `- Paleta de Colores de Marca: ${brandContext.colorPalette} — USA ESTOS COLORES en los visualPrompts de imagen cuando describes ambientes, elementos y atmósferas.` : ''}
  ${brandContext.brandPersonality ? `- Personalidad de Marca / USP: ${brandContext.brandPersonality} — Refleja esta personalidad en el tono y mensajes.` : ''}
  
  ## REGLAS DE ORO DEL COPY (OBLIGATORIO: TODO EN ESPAÑOL):
  1. TODO EL OUTPUT DEBE ESTAR EN ESPAÑOL. NUNCA EN INGLÉS.
  2. Habla DIRECTAMENTE al ${brandContext.targetAudience || 'cliente'} usando SUS palabras, dolores y deseos reales.
  3. El headline debe DETENER el scroll — usa gatillos mentales: curiosidad, dolor, promesa audaz, número específico.
  4. El subheadline amplifica el headline con un beneficio concreto o prueba social.
  5. NUNCA uses frases genéricas como "Mejora tu vida" o "El mejor servicio". Sé ESPECÍFICO al nicho: ${brandContext.niche || 'el sector'}.
  6. El tono DEBE ser ${brandContext.tone || 'Profesional y Persuasivo'} en TODOS los slides.
  7. La CTA debe crear urgencia o reducir fricción (ej: "Agenda tu llamada gratis", "Ver cómo funciona").
  ${brandContext.colorPalette ? `8. En los visualPrompts de imagen, incorpora la paleta de colores de marca: ${brandContext.colorPalette}` : ''}
  
  ## IDEA BASE DEL USUARIO (úsala como inspiración, no copiando literalmente - RESPONDER SIEMPRE EN ESPAÑOL):
  "${prompt}"
  
  ${brandContext.tone ? `## TONO ESPECÍFICO: ${brandContext.tone} — que esto se SIENTA en cada palabra.` : ''}
  - HeadlineSize sugeridos: 40-70 para Single, 35-50 para Carrusel.
  `;

  if (styleReference) {
    sysInstruction += `\nESTILO VISUAL Y TIPOGRÁFICO DE REFERENCIA: Se ha proporcionado una imagen de marca. Analízala y extrae:
    1. Paleta de colores dominante y acentos.
    2. Identificación de Tipografía: si es sans-serif moderna, serif elegante, manuscrita, etc.
    3. Atmósfera: minimalista, vibrante, oscura, corporativa, etc.
    APLICA este mismo ADN visual a toda la campaña. Es fundamental que el resultado final sea consistente con esta referencia de diseño.`;
  }

  if (characterReference) {
    sysInstruction += `\nPERSONAJE DE REFERENCIA: Se ha proporcionado una imagen de una persona. La IA debe mantener la consistencia física de esta persona en todas las escenas generadas.`;
  }

  const hasSlideMarkers = /slide \d+/i.test(prompt) || /\[slide \d+\]/i.test(prompt);

  if (type === 'angles-batch') {
    sysInstruction += `\nTarea: Generar EXACTAMENTE 6 variaciones visuales de ALTO IMPACTO (Ángulos: Dolor, Deseo, Romper Objeción, Lógica, Urgencia, Creativo). Cada una con un ángulo completamente diferente. Inspírate en: "${prompt}". Output JSON.`;
  } else if (type === 'single-image') {
    sysInstruction += `\nTarea: Generar EXACTAMENTE 1 sola imagen publicitaria. El array 'slides' debe tener SOLO 1 elemento. Output JSON.`;
  } else {
    sysInstruction += `\nTarea: Crear un carrusel de EXACTAMENTE ${targetSlides} slides con narrativa continua (hook→problema→solución→beneficio→prueba→CTA). Output JSON con ${targetSlides} items en el array 'slides'.`;
  }

  sysInstruction += `\n\nIMPORTANTE: El campo 'slides' del JSON debe tener EXACTAMENTE ${targetSlides} elemento(s). Ni más, ni menos.`;

  const contentParts: any[] = [];
  if (styleReference) {
    const refs = Array.isArray(styleReference) ? styleReference : [styleReference];
    refs.forEach(ref => {
      const base64Data = ref?.split(',')[1];
      if (base64Data) contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
    });
  }
  if (characterReference) {
    const refs = Array.isArray(characterReference) ? characterReference : [characterReference];
    refs.forEach(ref => {
      const base64Data = ref?.split(',')[1];
      if (base64Data) contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
    });
  }
  contentParts.push({ text: sysInstruction });

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      designTheme: {
        type: Type.OBJECT,
        properties: {
          primaryColor: { type: Type.STRING },
          accentColor: { type: Type.STRING },
          headlineFont: { type: Type.STRING },
          subHeadlineFont: { type: Type.STRING },
          ctaBgColor: { type: Type.STRING },
          ctaColor: { type: Type.STRING }
        },
        required: ['primaryColor', 'accentColor', 'headlineFont']
      },
      slides: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            subHeadline: { type: Type.STRING },
            cta: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            layout: { type: Type.STRING },
            textAlign: { type: Type.STRING },
            angleLabel: { type: Type.STRING }
          },
          required: ['headline', 'subHeadline', 'visualPrompt']
        }
      }
    },
    required: ['title', 'slides', 'designTheme']
  };

  const models = [
    "models/gemini-2.0-flash",
    "models/gemini-2.5-flash-preview-04-17",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro"
  ];

  for (const model of models) {
    try {
      console.log(`Copy Gen: Trying ${model}...`);
      const response = await withTimeout(
        ai.models.generateContent({
          model: model,
          contents: [{ parts: contentParts }],
          config: { responseMimeType: "application/json", responseSchema: schema }
        }),
        30000,
        `Copy Generation Timeout: ${model}`
      );
      const parsed = JSON.parse(cleanJSON(response.text || '{}'));
      // Validate the response has actual slides with real content
      if (parsed?.slides?.length > 0 && parsed.slides[0]?.headline && !parsed.slides[0].headline.includes('TU SECTOR')) {
        return parsed;
      }
      // If slides are empty or generic, try next model
      console.warn(`${model} returned generic/empty slides, trying next model...`);
    } catch (err: any) {
      console.warn(`${model} copy gen failed:`, err.message);
    }
  }

  return getSafeFallback(prompt, style, brandContext, type, slideCount);
};

export const generateSlideImage = async (
  prompt: string,
  style: VisualStyle,
  useReference: boolean,
  aspectRatio: string = "3:4",
  accentColor?: string,
  isBatch: boolean = false,
  characterReference?: string | string[],
  customStyle?: string,
  styleReference?: string | string[]
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let stylePrefix = customStyle || STYLE_CONFIGS[style]?.promptPrefix || "";

  let fullPrompt = `${stylePrefix} ${prompt}. Aspect ratio strictly ${aspectRatio}. Optimized for ${aspectRatio} viewport. Professional photography, high end production.`;

  if (characterReference) {
    fullPrompt += ` CHARACTER CONSISTENCY MANDATE: The person depicted MUST exactly match the reference photo provided — same face, ethnicity, age, hair, and physical features. This is non-negotiable for brand consistency across all slides.`;
  }

  // Image generation models — ordered by quality/availability
  // gemini-2.0-flash-exp-image-generation removed: returns 404 on v1beta
  const imgModels = [
    'models/gemini-3.1-flash-image-preview',
    'models/nano-banana-pro-preview',
    'models/gemini-2.5-flash-image',
  ];

  const configObj: any = {
    responseModalities: ['TEXT', 'IMAGE'],
    aspectRatio: aspectRatio
  };

  const contentParts: any[] = [];

  if (styleReference) {
    const refs = Array.isArray(styleReference) ? styleReference : [styleReference];
    refs.forEach(ref => {
      const base64Data = ref?.split(',')[1];
      if (base64Data) contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
    });
    fullPrompt += ` \nSTYLE REFERENCE INSTRUCTION: Replicate the EXACT visual DNA of the provided reference image. This includes:
        1. COLOR PALETTE: Use the same dominant colors and accent glows (e.g., magenta/purple neon).
        2. TYPOGRAPHY & GRAPHICS: Mimic the font style, weight, and any graphical effects (glitch, pixelation, overlays).
        3. LIGHTING & ATMOSPHERE: Match the high-contrast lighting, dramatic shadows, and overall 'Vibe'.
        Apply this BRAND STYLE to the subject: ${prompt}. The goal is consistency so they look part of the same campaign.`;
  }

  if (characterReference) {
    const refs = Array.isArray(characterReference) ? characterReference : [characterReference];
    refs.forEach(ref => {
      const base64Data = ref?.split(',')[1];
      if (base64Data) contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
    });
  }

  contentParts.push({ text: fullPrompt });

  for (const model of imgModels) {
    // Each model gets 2 attempts: retry once on 503 (high demand / temporary)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`${model} retrying after 503 (attempt ${attempt + 1})...`);
          await new Promise(r => setTimeout(r, 3000));
        } else {
          console.log(`Image Generation: Trying ${model}...`);
        }

        const response = await withTimeout(
          ai.models.generateContent({
            model: model,
            contents: [{ parts: contentParts }],
            config: configObj
          }),
          45000,
          `Image Generation Timeout: ${model}`
        );

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if ((part as any).inlineData?.data) {
            const mime = (part as any).inlineData.mimeType || 'image/png';
            return `data:${mime};base64,${(part as any).inlineData.data}`;
          }
        }
        break; // No image in response, skip to next model
      } catch (err: any) {
        const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || String(err.status) === '503';
        if (is503 && attempt === 0) {
          console.warn(`${model} 503 — will retry in 3s`);
          continue; // Retry this model
        }
        console.warn(`${model} image gen failed:`, err.message);
        if (err.message?.includes("API key not valid") || String(err.status) === "403" || err.message?.includes("401")) {
          throw err; // Auth error — stop immediately
        }
        break; // Try next model
      }
    }
  }

  throw new Error("ALL_IMAGE_MODELS_FAILED");
};

export const regenerateSlideCopy = async (
  slideIndex: number,
  totalSlides: number,
  projectGoal: string,
  style: string,
  intent: string,
  currentHeadline: string
): Promise<any> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const positionMap: Record<number, string> = {
    0: "apertura/gancho (debe capturar atención inmediatamente)",
    1: "problema/dolor (profundiza el dolor del cliente)",
    2: "solución (presenta la propuesta de valor)",
    3: "prueba/beneficio (demuestra resultados reales)",
    4: "cierre/CTA (urgencia para que tome acción ahora)"
  };
  const position = positionMap[slideIndex] || `slide ${slideIndex + 1} de ${totalSlides}`;
  const response = await withTimeout(
    ai.models.generateContent({
      model: "models/gemini-2.0-flash",
      contents: [{ parts: [{ text: `Eres un copywriter de respuesta directa de élite. Reescribe el copy publicitario para este slide. TODO EL OUTPUT DEBE SER EN ESPAÑOL.

CONTEXTO:
- Objetivo de la campaña: ${projectGoal}
- Posición en el carrusel: ${position}
- Headline actual: "${currentHeadline}"
- Estilo visual: ${style}
- Intención: ${intent}

REGLAS:
1. El nuevo headline debe ser MÁS IMPACTANTE que el actual
2. Usa gatillos mentales: curiosidad, urgencia, dolor, promesa específica
3. El subHeadline debe amplificar y complementar el headline
4. La CTA debe crear acción inmediata (si aplica a este slide)
5. TODO en ESPAÑOL, lenguaje directo y poderoso
6. Máximo 10 palabras en el headline

Devuelve SOLO este JSON: {"headline": "...", "subHeadline": "...", "cta": "..."}` }] }],
      config: { responseMimeType: "application/json" }
    }),
    15000,
    "Regenerate Copy Timeout"
  );
  return JSON.parse(cleanJSON(response.text || '{}'));
};

export const magicRewrite = async (text: string, tone: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "models/gemini-1.5-flash",
        contents: [{ parts: [{ text: `Rewrite: "${text}" to be ${tone}. Spanish. Return ONLY text.` }] }],
      }),
      10000,
      "Magic Rewrite Timeout"
    );
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.split(',')[1] || base64Image;

  const editModels = [
    'models/gemini-3.1-flash-image-preview',
    'models/nano-banana-pro-preview',
    'models/gemini-2.5-flash-image',
  ];

  for (const model of editModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents: [{
              parts: [
                { inlineData: { data: base64Data, mimeType: "image/png" } },
                { text: `Edit this image: ${prompt}. Keep the same composition and subject but apply the requested changes. Return the edited image.` }
              ]
            }],
            config: { responseModalities: ['IMAGE', 'TEXT'] }
          }),
          40000,
          "Edit Image Timeout"
        );
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if ((part as any).inlineData?.data) {
            return `data:image/png;base64,${(part as any).inlineData.data}`;
          }
        }
        break;
      } catch (err: any) {
        const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || String(err.status) === '503';
        if (is503 && attempt === 0) continue;
        if (err.message?.includes("API key not valid") || String(err.status) === "403" || err.message?.includes("401")) throw err;
        break;
      }
    }
  }
  throw new Error("El modelo no devolvió una imagen editada. Intenta con una descripción diferente.");
};
export const generateVisualPromptForSlide = async (
  headline: string,
  subHeadline: string,
  slideIndex: number,
  totalSlides: number,
  brandContext: BrandContext,
  style: VisualStyle,
  overallBrief: string
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const styleDesc = STYLE_CONFIGS[style]?.name || style;
  const position = slideIndex === 0 ? 'apertura/gancho'
    : slideIndex === totalSlides - 1 ? 'cierre/CTA'
    : `slide ${slideIndex + 1} de ${totalSlides}`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: "models/gemini-2.0-flash",
      contents: [{ parts: [{ text: `Eres un director de arte experto en publicidad digital. Genera un prompt visual detallado en inglés para una imagen de alta calidad publicitaria.

SLIDE: ${position}
HEADLINE: "${headline}"
SUBHEADLINE: "${subHeadline}"
MARCA: ${brandContext.name || 'marca'}
NICHO: ${brandContext.niche || 'negocio'}
AUDIENCIA: ${brandContext.targetAudience || 'general'}
ESTILO: ${styleDesc}
${overallBrief ? `CONTEXTO: ${overallBrief}` : ''}
${brandContext.colorPalette ? `PALETA: ${brandContext.colorPalette}` : ''}

REGLAS:
- El prompt debe estar en INGLÉS
- Describe escena, iluminación, composición y atmósfera que complementen el headline
- Fotografía profesional de alta producción
- NO incluyas texto en el prompt (el texto se renderiza por separado)
- Máximo 2 oraciones precisas

Devuelve SOLO el prompt visual en inglés, sin comentarios ni comillas.` }] }],
    }),
    15000,
    "Visual Prompt Generation Timeout"
  );
  return response.text?.trim() || `Professional advertising scene for ${brandContext.niche || 'business'}, cinematic lighting, high-end production quality`;
};

export const generateVideo = async (prompt: string, images: string[]): Promise<string> => {
  console.log("Video generation not implemented in this version.");
  return "";
};
