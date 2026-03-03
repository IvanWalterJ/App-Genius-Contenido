
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
      model: "models/gemini-2.0-flash",
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
  referenceImage?: string,
  knowledgeBase?: string,
  textMode: 'overlay' | 'baked' = 'overlay'
): Promise<any> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let sysInstruction = `Rol: Director Creativo y Copywriter de Respuesta Directa (Direct Response) de Élite.
  Tu especialidad es el "Marketing de Impacto" y la psicología de ventas de alto CTR.
  
  Misión: Generar un copy y una identidad visual que conecte PROFUNDAMENTE con el avatar del cliente ideal.
  ${style === 'auto' ? 'ESTILO LIBRE: Tienes total libertad creativa para elegir el estilo visual más impactante y relevante para este nicho. Ignora estilos predefinidos y crea algo único.' : `ESTILO SOLICITADO: ${style}.`}
  
  CONTEXTO OBLIGATORIO DE MARCA (USA ESTO PARA TODO):
  - Nombre de Marca: ${brandContext.name}
  - Sector/Nicho: ${brandContext.niche}
  - Avatar de Cliente (Público): ${brandContext.targetAudience}
  - Personalidad/Tono: ${brandContext.tone}
  
  INSTRUCCIONES CRÍTICAS:
  1. Si ignoras el Nicho (${brandContext.niche}) o el Público (${brandContext.targetAudience}), la campaña SERÁ UN FRACASO.
  2. Todo el copy debe hablar directamente a los dolores y deseos de ${brandContext.targetAudience}.
  3. Las imágenes descritas en VisualPrompt deben mostrar escenarios donde ${brandContext.targetAudience} se sienta identificado en su vida diaria real.
  
  Idea Central: "${prompt}"

  ESTRATEGIA DE DISEÑO Y VISUALES:
  - Crea una IDENTIDAD VISUAL coherente exclusivamente con el sector: ${brandContext.niche}.
  - Los VisualPrompts deben reflejar escenarios, objetos y atmósferas relevantes para ${brandContext.targetAudience}.
  - EXTREMA CONSISTENCIA: Todas las imágenes deben usar la misma paleta y estilo publicitario de alto nivel.
  - TEXTO INTEGRADO (BAKED): Si el modo es 'baked', describe cómo el texto se fusiona (ej: luces LED, 3D sobre superficie, etc). No incluyas asteriscos.
  - Define esta identidad en el objeto 'designTheme' al inicio del JSON.
  - HeadlineSize sugeridos: 40-70 para Single, 35-50 para Carrusel.
  `;

  const hasSlideMarkers = /slide \d+/i.test(prompt) || /\[slide \d+\]/i.test(prompt);

  if (type === 'angles-batch') {
    sysInstruction += `\nTarea: Generar EXACTAMENTE 6 variaciones visuales de ALTO IMPACTO (Ángulos: Dolor, Deseo, Romper Objeción, Lógica, Urgencia, Creativo). Ignora cualquier estructura de slides del usuario, enfócate en los 6 ángulos. Output JSON.`;
  } else if (type === 'single-image') {
    sysInstruction += `\nTarea: Generar EXACTAMENTE 1 sola imagen publicitaria de impacto. Ignora cualquier estructura de slides múltiple, concentra todo en 1 slide. Output JSON.`;
  } else {
    if (hasSlideMarkers) {
      sysInstruction += `\nTAREA CRÍTICA: Se ha detectado una estructura de SLIDES en la Idea Central. 
      - DEBES seguir el número exacto de slides indicados (ej: si hay Slide 1, 2 y 3, genera solo 3 slides).
      - DEBES usar el texto proporcionado para cada slide PALABRA POR PALABRA como Headline. NO agregues ni quites nada.
      - Crea un VisualPrompt que acompañe perfectamente a ese texto específico.`;
    } else {
      sysInstruction += `\nTarea: Crear carrusel de EXACTAMENTE 6 slides con narrativa continua. Output JSON.`;
    }
  }

  sysInstruction += `\n\nREGLA DE ORO DE TEXTO: Si la Idea Central parece ser un copy terminado o contiene instrucciones de texto específicas, tu prioridad es la FIDELIDAD. No cambies el mensaje del usuario. Úsalo como headline principal.`;

  const contentParts: any[] = [];
  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
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
    "models/gemini-1.5-flash"
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
  characterReference?: string
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let stylePrefix = STYLE_CONFIGS[style]?.promptPrefix || "";
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

  const imgModels = [
    'models/gemini-3.1-flash-image-preview', // Nano Banana 2
    'models/gemini-2.5-flash-image',         // Nano Banana
    'models/gemini-2.0-flash-exp',           // Gemini 2.0 Exp
    'models/imagen-3.0-generate-001'         // Imagen 3
  ];

  for (const model of imgModels) {
    try {
      console.log(`Image Generation: Trying ${model}...`);

      const configObj: any = {
        responseModalities: ['IMAGE'],
        // Explicitly pass standard aspect ratios if provided
        aspectRatio: aspectRatio
      };

      const contentParts: any[] = [{ text: fullPrompt }];
      if (characterReference) {
        const base64Data = characterReference.split(',')[1];
        contentParts.unshift({ inlineData: { mimeType: "image/png", data: base64Data } });
      }

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
      if (err.message?.includes("not found") || err.message?.includes("not supported")) {
        continue; // Try next model in tier
      }
      throw err; // Stop if it's a safety/key issue
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
      model: "models/gemini-2.0-flash",
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
      model: "models/gemini-2.0-flash",
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
      model: 'models/gemini-2.0-flash',
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
