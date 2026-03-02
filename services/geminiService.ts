
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
  // Use a safer check for environment variables that Vite's 'define' can easily find
  let key: string | null = null;
  try {
    // Vite built-in
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
      key = import.meta.env.VITE_GEMINI_API_KEY;
    }
  } catch (e) { }

  if (!key) {
    // These should be replaced by Vite during build/dev
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
      model: "gemini-1.5-flash", // More stable alias
      contents: `Rewrite prompt for marketing. Input: "${rawPrompt}". Output Spanish. Keep it short. Return ONLY text.`,
    });
    return response.text?.trim() || rawPrompt;
  } catch (e: any) {
    console.error("Enhance Prompt Error:", e.message);
    if (e.message?.includes("Requested entity was not found") || e.message?.includes("leaked") || e.message?.includes("PERMISSION_DENIED")) {
      // Only throw if we think it's a key issue, but 404 might just be the model name
      if (e.message?.includes("Requested entity was not found")) {
        console.warn("Model not found, skipping enhancement.");
        return rawPrompt;
      }
      throw e;
    }
    return rawPrompt;
  }
};

export const generateAdCopy = async (
  prompt: string,
  type: 'single-image' | 'carousel' | 'angles-batch',
  intent: ContentIntent,
  style: VisualStyle,
  brandContext: BrandContext,
  referenceImage?: string,
  knowledgeBase?: string,
  textMode: 'overlay' | 'baked' = 'overlay'
): Promise<Partial<AdProject>> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
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

  DISEÑO AUTÓNOMO Y CONSISTENCIA:
  - Tu tarea es decidir por el usuario el diseño visual más eficaz.
  - Elige una paleta de colores (Primary y Accent) que resuene con el nicho y el tono.
  - Selecciona tipografías del set: font-sans (Inter), font-brand (Montserrat), font-display (Bebas), font-serif (Playfair), font-oswald (Oswald), font-modern (Poppins).
  - Asegura que el diseño sea coherente en todos los slides.
  - Al generar el VisualPrompt, ten en cuenta que el texto se integrará después (overlay) o en la imagen (baked). Si es 'baked' (texto integrado), especifica cómo debe verse el texto en el VisualPrompt.
  - HeadlineSize sugeridos: 40-70 para Single Image, 35-50 para Carruseles.
  - SubHeadlineSize sugeridos: 16-24 para Single Image, 14-18 para Carruseles.
  `;

  if (type === 'angles-batch') {
    sysInstruction += `
     Tarea: Generar 6 variaciones visuales de ALTO IMPACTO probando diferentes ángulos de marketing.
     Output JSON con 6 items en el array 'slides'.
     Ángulos a usar: Dolor Agudo, Deseo Oculto, Romper Objeción, Lógica/Datos, Urgencia/FOMO, Creativo/Meme.
     Reglas:
     - Headline: DEBE TENER UN GANCHO CLARO Y ATACAR UN ÁNGULO ESPECÍFICO. Usa *asteriscos* para resaltar la palabra clave (Ej: "El *Error* que te cuesta ventas").
     - SubHeadline: Breve (1 línea), que complemente el gancho.
     - VisualPrompt: Describe la imagen de fondo conceptual (SIN TEXTO) para este ángulo. DEBE SER DISRUPTIVA.`;
  } else if (type === 'single-image') {
    sysInstruction += `
     Tarea: Generar 1 sola imagen publicitaria de altísimo impacto.
     Output JSON con 1 item en el array 'slides'.
     Reglas:
     - Headline: Gancho extremadamente poderoso y corto. Usa *asteriscos* para resaltar la palabra clave.
     - SubHeadline: Propuesta de valor clara o curiosidad.
     - VisualPrompt: Describe una imagen de fondo que llame muchísimo la atención, inusual o de alto contraste.`;
  } else {
    sysInstruction += `
     Tarea: Crear un carrusel de 6 slides con una narrativa continua, adictiva y lógica.
     ESTRUCTURA DE COMUNICACIÓN:
     Slide 1 (Gancho): Título disruptivo/contraintuitivo que obligue a frenar.
     Slide 2 (El Problema Real): Qué está haciendo mal la gente hoy (el enemigo común).
     Slide 3 (Agitación): Por qué ese error es peor de lo que piensan.
     Slide 4 (El Cambio de Paradigma): La nueva forma de verlo (tu solución).
     Slide 5 (La Evidencia/Beneficio): Por qué funciona tu método.
     Slide 6 (Llamada a la Acción): Oferta clara e irresistible.

     REGLAS:
     - Headlines: Impactantes, usan *asteriscos* en la palabra clave.
     - SubHeadlines: EXPLICATIVOS y VALIOSOS. 2-3 líneas de texto.
     - VisualPrompt: Imágenes que mantengan la atención, consistentes pero variadas.`;
  }

  if (knowledgeBase) {
    sysInstruction += `\nContexto extra: ${knowledgeBase.substring(0, 1000)}\n`;
  }

  const contentParts: any[] = [];
  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    contentParts.push({ inlineData: { mimeType: "image/png", data: base64Data } });
    sysInstruction += `\nUsa estilo de imagen adjunta.`;
  }
  contentParts.push({ text: sysInstruction });

  const schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      designTheme: {
        type: Type.OBJECT,
        properties: {
          primaryColor: { type: Type.STRING, description: "Hex code for primary background/brand color" },
          accentColor: { type: Type.STRING, description: "Hex code for highlighting key words" },
          headlineFont: { type: Type.STRING, enum: ['font-sans', 'font-brand', 'font-display', 'font-serif', 'font-oswald', 'font-modern', 'font-hand'] },
          subHeadlineFont: { type: Type.STRING, enum: ['font-sans', 'font-brand', 'font-modern', 'font-merriweather'] },
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
            layout: { type: Type.STRING, enum: ['centered', 'bottom-heavy', 'top-heavy', 'split-vertical'] },
            textAlign: { type: Type.STRING, enum: ['left', 'center', 'right'] },
            angleLabel: { type: Type.STRING },
            headlineSize: { type: Type.NUMBER },
            subHeadlineSize: { type: Type.NUMBER }
          },
          required: ['headline', 'subHeadline', 'visualPrompt']
        }
      }
    },
    required: ['title', 'slides', 'designTheme']
  };

  const generateWithFallback = async () => {
    const models = [
      "gemini-2.0-flash",   // Nano Banana 2.0 (Fastest & Newest)
      "gemini-1.5-flash",   // Stable fallback
      "gemini-1.5-pro"      // High reasoning fallback
    ];

    for (const model of models) {
      try {
        console.log(`Copy Gen: Trying ${model}...`);
        return await ai.models.generateContent({
          model: model,
          contents: { parts: contentParts },
          config: { responseMimeType: "application/json", responseSchema: schema }
        });
      } catch (error: any) {
        console.warn(`${model} failed:`, error.message);
        // ONLY throw early if the key is leaked, otherwise keep trying models
        if (error.message?.includes("leaked")) {
          throw error;
        }
      }
    }
    throw new Error("ALL_AI_FAILED");
  };

  try {
    const response = await generateWithFallback();
    const rawText = response.text;
    if (!rawText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(cleanJSON(rawText));
    if (!parsed.slides || parsed.slides.length === 0) throw new Error("Invalid slides structure from AI");

    // --- POST PROCESSING LOGIC ---
    if (type === 'carousel') {
      parsed.slides.forEach((slide: any, index: number) => {
        if (index < parsed.slides.length - 1) {
          delete slide.cta;
        } else if (!slide.cta) {
          slide.cta = "SABER MÁS";
        }
      });
    } else if (type === 'single-image') {
      if (!parsed.slides[0].cta) parsed.slides[0].cta = "CLICK AQUÍ";
    }

    return parsed;
  } catch (error: any) {
    console.error("Copy Gen Error Details:", error);
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("leaked") || error.message?.includes("PERMISSION_DENIED")) {
      throw error; // Let App.tsx handle key reset
    }
    throw new Error("ALL_AI_FAILED");
  }
};


const buildBakedPrompt = (
  headline: string,
  subHeadline: string,
  visualPrompt: string,
  styleInstructions: string,
  accentColor: string | null = null,
  fontFamily: string = 'Bold Sans-Serif',
  isAngleMode: boolean = false
): string => {

  const colorDesc = accentColor ? `Color Palette: High contrast with accents in ${accentColor}` : 'Color Palette: High contrast White/Gold';
  const fontDesc = `Font Style: ${fontFamily.replace('font-', '')} (Premium, Bold, highly legible).`;

  if (isAngleMode) {
    return `
      MASTERPIECE TYPOGRAPHY POSTER. 
      TEXT TO RENDER: "${headline}"
      
      RULES:
      1. COMPOSITION: Text is the hero. Occupy 70% of the canvas.
      2. TYPOGRAPHY: ${fontDesc}.
      3. LEGIBILITY: Clear, crisp edges. Subtle drop shadow for depth.
      4. STYLE: ${styleInstructions}.
      5. BACKGROUND: ${visualPrompt}. 
      6. ${colorDesc}.
      7. NO MISTAKES IN SPELLING.
      `;
  }

  return `
  Premium Marketing Visual with Integrated Text.
  STYLE: ${styleInstructions}
  SCENE: ${visualPrompt}
  
  TEXT RENDERING INSTRUCTIONS:
  - MAIN HEADLINE: "${headline}"
  - SUB-TEXT (optional): "${subHeadline}"
  - ${fontDesc}
  - ${colorDesc}
  - POSITION: Naturally integrated into the scene (e.g., on a wall, floating 3D, or clean overlay).
  - High quality, professional graphic design standards.
  `;
};


export const generateSlideImage = async (
  visualPrompt: string,
  style: VisualStyle,
  useReferenceStyle: boolean = false,
  aspectRatio: AspectRatio = "1:1",
  headlineContext: string = "",
  textMode: 'overlay' | 'baked' = 'overlay',
  subHeadlineContext: string = "",
  userAccentColor: string | null = null,
  isAngleMode: boolean = false,
  fontFamily: string = "font-sans"
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const styleConfig = STYLE_CONFIGS[style];
  const specificInstructions = styleConfig ? (styleConfig as any).promptPrefix || '' : '';

  const cleanHeadline = headlineContext.replace(/\*/g, '').trim();

  let fullPrompt = "";
  if (textMode === 'baked') {
    fullPrompt = buildBakedPrompt(
      cleanHeadline,
      subHeadlineContext,
      visualPrompt,
      specificInstructions,
      userAccentColor,
      fontFamily,
      isAngleMode
    );
  } else {
    fullPrompt = `Background image. ${visualPrompt}. Style: ${specificInstructions}. No text.`;
  }

  // IMAGE MODEL TIERED FALLBACK
  const imgModels = [
    'gemini-2.0-flash',       // Nano Banana 2.0 (Imagen 3 inside)
    'imagen-3-generate-001',  // Dedicated Imagen 3
    'imagen-4.0-generate-001' // Imagen 4
  ];

  for (const model of imgModels) {
    try {
      console.log(`Image Generation: Trying ${model}...`);

      // Different SDK calls for Imagen vs Gemini-Image
      if (model.includes('imagen')) {
        const response = await ai.models.generateImages({
          model: model,
          prompt: fullPrompt,
          config: { numberOfImages: 1, aspectRatio: aspectRatio as any, outputMimeType: 'image/jpeg' }
        });
        const b64 = response.generatedImages?.[0]?.image?.imageBytes;
        if (b64) return `data:image/jpeg;base64,${b64}`;
      } else {
        const response = await ai.models.generateContent({
          model: model,
          contents: { parts: [{ text: fullPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: "1K"
            }
          }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No data returned");
    } catch (imgErr: any) {
      console.warn(`${model} for image generation failed:`, imgErr.message);
      if (imgErr.message?.includes("leaked")) {
        throw imgErr;
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
): Promise<{ headline: string; subHeadline: string; cta?: string }> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `Rewrite ad copy. Slide ${slideIndex + 1}. Context: ${projectGoal}. Old: ${currentHeadline}. Output JSON {headline, subHeadline, cta}.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(cleanJSON(response.text || '{}'));
};

export const magicRewrite = async (text: string, tone: 'shorter' | 'punchier' | 'emotional'): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Rewrite: "${text}" to be ${tone}. Spanish. Return ONLY text.`,
    });
    return response.text?.trim().replace(/^"|"$/g, '') || text;
  } catch (e: any) {
    if (e.message?.includes("Requested entity was not found") || e.message?.includes("leaked") || e.message?.includes("PERMISSION_DENIED")) {
      throw e;
    }
    return text;
  }
}

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const mimeType = base64Image.includes('image/png') ? 'image/png' : 'image/jpeg';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from edit");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("leaked") || error.message?.includes("PERMISSION_DENIED")) {
      throw error;
    }
    throw error;
  }
};

export const generateVideo = async (
  prompt: string,
  base64Image?: string,
  aspectRatio: '16:9' | '9:16' = '16:9',
  onProgress?: (status: string) => void
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  onProgress?.("Iniciando generación de video...");

  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: aspectRatio,
  };

  const payload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: config,
  };

  if (base64Image) {
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const mimeType = base64Image.includes('image/png') ? 'image/png' : 'image/jpeg';
    payload.image = {
      imageBytes: base64Data,
      mimeType: mimeType,
    };
  }

  try {
    let operation = await ai.models.generateVideos(payload);

    while (!operation.done) {
      onProgress?.("Procesando video (esto puede tardar unos minutos)...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video link returned");

    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey!,
      },
    });

    if (!response.ok) throw new Error("Failed to download video");

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("leaked") || error.message?.includes("PERMISSION_DENIED")) {
      throw error;
    }
    throw error;
  }
};
