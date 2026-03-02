
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
const getSafeFallback = (prompt: string, style: string): any => {
  return {
    title: "Campaña: " + prompt.substring(0, 20) + "...",
    slides: [
      {
        headline: "ATENCIÓN: *Oportunidad* Única",
        subHeadline: "¿Estás listo para transformar tus resultados hoy mismo? Descubre el método exacto que estamos utilizando.",
        visualPrompt: "Minimalist abstract background, high contrast, professional lighting",
        layout: "centered",
        angleLabel: "GANCHO"
      },
      {
        headline: "El *Problema* Real",
        subHeadline: "La mayoría ignora este detalle crucial y pierde dinero intentando adivinar el camino correcto sin guía.",
        visualPrompt: "Moody cinematic lighting, dark tones, serious atmosphere",
        layout: "bottom-heavy",
        angleLabel: "DOLOR"
      },
      {
        headline: "Nuestra *Solución*",
        subHeadline: "Hemos desarrollado un sistema probado paso a paso para lograr el éxito sin complicaciones técnicas.",
        visualPrompt: "Bright, clean, technological aesthetic, blue tones",
        layout: "centered",
        angleLabel: "SOLUCIÓN"
      },
      {
        headline: "Resultados *Garantizados*",
        subHeadline: "Únete a cientos de clientes satisfechos que ya han cambiado su trayectoria con nosotros.",
        visualPrompt: "Success lifestyle imagery, warm golden lighting",
        layout: "top-heavy",
        angleLabel: "PRUEBA"
      },
      {
        headline: "Tu Nueva *Realidad*",
        subHeadline: "Imagina lograr tus objetivos sin estrés y con tiempo libre para disfrutar lo que construiste.",
        visualPrompt: "Inspirational landscape, sunrise, hopeful vibe",
        layout: "centered",
        angleLabel: "BENEFICIO"
      },
      {
        headline: "Accede *Ahora*",
        subHeadline: "Oferta limitada. No dejes pasar esta oportunidad de cambiar tu futuro hoy mismo.",
        cta: "REGÍSTRATE AQUÍ",
        visualPrompt: "High end abstract geometric shapes, dynamic composition",
        layout: "bottom-heavy",
        angleLabel: "CIERRE"
      }
    ]
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
  
  Contexto de la Marca:
  - Nombre: ${brandContext.name}
  - Nicho/Industria: ${brandContext.niche}
  - Público Objetivo: ${brandContext.targetAudience}
  - Tono de Voz: ${brandContext.tone}
  
  Misión: Generar un copy que sea IMPOSIBLE de ignorar (Scroll-stopping).
  
  Tema a tratar: "${prompt}"

  ESTRATEGIA DE DISEÑO AUTÓNOMO (BRAND IDENTITY):
  - Tu misión es crear una IDENTIDAD VISUAL única y consistente para este proyecto.
  - Elige una paleta de 2 colores (Primary y Accent) que vibren con el sector.
  - Selecciona tipografías del set: font-sans (Inter), font-brand (Montserrat), font-display (Bebas), font-serif (Playfair), font-oswald (Oswald), font-modern (Poppins).
  - EXTREMA CONSISTENCIA: Todas las imágenes deben parecer parte de la misma campaña.
  - TEXTO INTEGRADO (BAKED): Si el modo es 'baked', describe en el VisualPrompt cómo se fusiona el texto con la imagen.
  - Define esta identidad en el objeto 'designTheme' al inicio del JSON.
  - HeadlineSize sugeridos: 40-70 para Single, 35-50 para Carrusel.
  `;

  if (type === 'angles-batch') {
    sysInstruction += `\nTarea: Generar 6 variaciones visuales de ALTO IMPACTO (Ángulos: Dolor, Deseo, Romper Objeción, Lógica, Urgencia, Creativo). Output JSON.`;
  } else if (type === 'single-image') {
    sysInstruction += `\nTarea: Generar 1 sola imagen publicitaria de impacto. Output JSON.`;
  } else {
    sysInstruction += `\nTarea: Crear carrusel de 6 slides con narrativa continua. Output JSON.`;
  }

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

  return getSafeFallback(prompt, style);
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
  headlineFont?: string
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let stylePrefix = STYLE_CONFIGS[style]?.promptPrefix || "";
  let fullPrompt = `${stylePrefix} ${prompt}. Professional advertisement photography, high end production.`;

  if (textMode === 'baked' && headline) {
    fullPrompt += ` The following text is visually INTEGRATED into the scene in a ${style} aesthetic: "${headline}".`;
    if (subHeadline) fullPrompt += ` Small supportive text: "${subHeadline}".`;
    if (accentColor) fullPrompt += ` Use ${accentColor} for primary visual highlights and text lighting.`;
    if (headlineFont) fullPrompt += ` Typography style: ${headlineFont}.`;
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
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: { responseModalities: ['IMAGE'] }
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
