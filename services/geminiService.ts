
import { GoogleGenAI, Type } from "@google/genai";
import { Slide, AdProject, ContentIntent, VisualStyle, AspectRatio, BrandContext } from "../types";
import { STYLE_CONFIGS } from "../constants";

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
const getSafeFallback = (prompt: string, style: string, brand: BrandContext, type: string): any => {
  const niche = brand.niche || "tu sector";
  const audience = brand.targetAudience || "tu audiencia";

  const slides = [
    {
      headline: `ATENCIÓN: *${niche.toUpperCase()}* para ${brand.name || 'ti'}`,
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
    }
  ];

  return {
    title: `Campaña: ${niche}`,
    designTheme: {
      primaryColor: "#0a0a0a",
      accentColor: "#facc15",
      headlineFont: "font-brand",
      subHeadlineFont: "font-modern"
    },
    slides: type === 'single-image' ? [slides[0]] : slides
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
  try {
    const response = await ai.models.generateContent({
      model: "models/gemini-1.5-flash",
      contents: [{ parts: [{ text: `Rewrite prompt for marketing. Input: "${rawPrompt}". Output Spanish. Keep it short. Return ONLY text.` }] }],
    });
    return response.text?.trim() || rawPrompt;
  } catch (e: any) {
    console.error("Enhance Prompt Error:", e.message);
    return rawPrompt;
  }
};

export const generateAdCopy = async (
  prompt: string,
  type: 'carousel' | 'single-image' | 'angles-batch' = 'carousel',
  intent: ContentIntent,
  style: VisualStyle,
  brandContext: BrandContext,
  styleReference?: string,
  knowledgeBase?: string,
  textMode: 'overlay' | 'baked' = 'overlay',
  characterReference?: string,
  slideCount: number = 6
): Promise<any> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const isVolume = type === 'angles-batch';
  const targetSlides = type === 'single-image' ? 1 : (type === 'angles-batch' ? 6 : slideCount);

  let sysInstruction = `Rol: Director Creativo y Copywriter de Respuesta Directa de Élite, especializado en marketing de impacto y psicología de ventas de alto CTR.
  
  ## BRIEF CREATIVO
  El usuario ha proporcionado una IDEA/CONCEPTO como punto de partida. Tu trabajo es INTERPRETARLA y TRANSFORMARLA en un copy poderoso.
  NO copies el texto del usuario literalmente. Úsalo como inspiración para crear algo ORIGINAL, POTENTE y que conecte EMOCIONALMENTE.
  
  ## CONTEXTO DE MARCA (OBLIGATORIO - PERSONALIZA TODO A ESTO):
  - Nombre de Marca: ${brandContext.name || '(sin nombre)'}
  - Sector/Nicho: ${brandContext.niche || '(sin nicho)'}
  - Público Objetivo: ${brandContext.targetAudience || '(audiencia general)'}
  - Tono de Voz: ${brandContext.tone || 'Profesional y Persuasivo'}
  
  ## REGLAS DE ORO DEL COPY (OBLIGATORIO: TODO EN ESPAÑOL):
  1. TODO EL OUTPUT DEBE ESTAR EN ESPAÑOL. NUNCA EN INGLÉS.
  2. Habla DIRECTAMENTE al ${brandContext.targetAudience || 'cliente'} usando SUS palabras, dolores y deseos reales.
  3. El headline debe DETENER el scroll — usa gatillos mentales: curiosidad, dolor, promesa audaz, número específico.
  4. El subheadline amplifica el headline con un beneficio concreto o prueba social.
  5. NUNCA uses frases genéricas como "Mejora tu vida" o "El mejor servicio". Sé ESPECÍFICO al nicho: ${brandContext.niche || 'el sector'}.
  6. El tono DEBE ser ${brandContext.tone || 'Profesional y Persuasivo'} en TODOS los slides.
  7. La CTA debe crear urgencia o reducir fricción (ej: "Agenda tu llamada gratis", "Ver cómo funciona").
  
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
    const base64Data = styleReference.split(',')[1];
    contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
  }
  if (characterReference) {
    const base64Data = characterReference.split(',')[1];
    contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
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
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro"
  ];

  for (const model of models) {
    try {
      console.log(`Copy Gen: Trying ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: contentParts }],
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      return JSON.parse(cleanJSON(response.text || '{}'));
    } catch (err: any) {
      console.warn(`${model} copy gen failed:`, err.message);
    }
  }

  return getSafeFallback(prompt, style, brandContext, type);
};

export const generateSlideImage = async (
  prompt: string,
  style: VisualStyle,
  useReference: boolean,
  aspectRatio: string = "3:4",
  headline?: string,
  textMode: 'overlay' | 'baked' = 'overlay',
  subHeadline?: string,
  accentColor?: string,
  isBatch: boolean = false,
  headlineFont?: string,
  characterReference?: string,
  customStyle?: string,
  styleReference?: string
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let stylePrefix = customStyle || STYLE_CONFIGS[style]?.promptPrefix || "";
  // Clean asterisks for baked mode as Nano Banana 2 renders them literally
  const cleanHeadline = headline?.replace(/\*/g, '') || "";
  const cleanSubHeadline = subHeadline?.replace(/\*/g, '') || "";

  let fullPrompt = `${stylePrefix} ${prompt}. Aspect ratio strictly ${aspectRatio}. Optimized for ${aspectRatio} viewport. Professional photography, high end production.`;

  if (textMode === 'baked' && cleanHeadline) {
    fullPrompt += ` STRICTURE: Render the EXACT text "${cleanHeadline}" on the image. DO NOT add any other words, letters, or symbols. DO NOT change the spelling. Fidelity is mandatory.`;
    if (cleanSubHeadline) fullPrompt += ` Small secondary text: "${cleanSubHeadline}".`;
    if (accentColor) fullPrompt += ` Visual accent color: ${accentColor}.`;
    if (headlineFont) fullPrompt += ` Modern typography style.`;
    fullPrompt += ` Ensure all text is perfectly legible, properly balanced, and fits within the ${aspectRatio} boundaries without clipping.`;
  }

  if (characterReference) {
    fullPrompt += ` MANDATORY: The person in this image must match the face, ethnicity, age, and features of the provided reference character. EXTREME CONSISTENCY with the person is required.`;
  }

  // ✅ VERIFIED model names - confirmed via ListModels API on 2026-03-04
  // Primary: Nano Banana 2 (gemini-3.1-flash-image-preview)
  // DO NOT CHANGE without running check_models.js first
  const imgModels = [
    'models/gemini-3.1-flash-image-preview',  // Nano Banana 2 - VERIFIED
    'models/nano-banana-pro-preview',          // Nano Banana Pro - VERIFIED  
    'models/gemini-2.5-flash-image',           // Gemini 2.5 Flash Image - VERIFIED
    'models/gemini-2.0-flash-exp-image-generation' // Legacy fallback - VERIFIED
  ];

  for (const model of imgModels) {
    try {
      console.log(`Image Generation: Trying ${model}...`);

      const configObj: any = {
        responseModalities: ['TEXT', 'IMAGE'],
        aspectRatio: aspectRatio
      };

      const contentParts: any[] = [];

      if (styleReference) {
        const base64Data = styleReference.split(',')[1];
        contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
        // Add a specialized style instruction
        fullPrompt += ` \nSTYLE REFERENCE INSTRUCTION: Replicate the EXACT visual DNA of the provided reference image. This includes: 
        1. COLOR PALETTE: Use the same dominant colors and accent glows (e.g., magenta/purple neon).
        2. TYPOGRAPHY & GRAPHICS: Mimic the font style, weight, and any graphical effects (glitch, pixelation, overlays).
        3. LIGHTING & ATMOSPHERE: Match the high-contrast lighting, dramatic shadows, and overall 'Vibe'.
        Apply this BRAND STYLE to the subject: ${prompt}. The goal is consistency so they look part of the same campaign.`;
      }

      if (characterReference) {
        const base64Data = characterReference.split(',')[1];
        contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
      }

      // Add the final prompt after the visual references
      contentParts.push({ text: fullPrompt });

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: contentParts }],
        config: configObj
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if ((part as any).inlineData?.data) {
          const mime = (part as any).inlineData.mimeType || 'image/png';
          return `data:${mime};base64,${(part as any).inlineData.data}`;
        }
      }
    } catch (err: any) {
      console.warn(`${model} image gen failed:`, err.message);
      // Fallback for ANY error (500, 503, not found, etc) EXCEPT authentication errors.
      if (err.message?.includes("API key not valid") || String(err.status) === "403" || err.message?.includes("401")) {
        throw err; // Stop if it's an auth/key issue
      }
      continue; // Try next model in tier
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
  try {
    const response = await ai.models.generateContent({
      model: "models/gemini-1.5-flash",
      contents: [{ parts: [{ text: `Rewrite ad copy. Slide ${slideIndex + 1}/${totalSlides}. Goal: ${projectGoal}. Current: ${currentHeadline}. Output JSON {headline, subHeadline, cta}.` }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJSON(response.text || '{}'));
  } catch (e) {
    return { headline: currentHeadline, subHeadline: "" };
  }
};

export const magicRewrite = async (text: string, tone: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "models/gemini-1.5-flash",
      contents: [{ parts: [{ text: `Rewrite: "${text}" to be ${tone}. Spanish. Return ONLY text.` }] }],
    });
    return response.text?.trim() || text;
  } catch (e) {
    return text;
  }
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.split(',')[1] || base64Image;
  try {
    const response = await ai.models.generateContent({
      model: 'models/gemini-1.5-flash',
      contents: [{
        parts: [
          { inlineData: { data: base64Data, mimeType: "image/png" } },
          { text: prompt }
        ]
      }]
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData?.data) {
        return `data:image/png;base64,${(part as any).inlineData.data}`;
      }
    }
    return base64Image;
  } catch (e) {
    return base64Image;
  }
};
export const generateVideo = async (prompt: string, images: string[]): Promise<string> => {
  console.log("Video generation not implemented in this version.");
  return "";
};
