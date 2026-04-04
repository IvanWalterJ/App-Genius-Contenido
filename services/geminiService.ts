
import { GoogleGenAI, Type } from "@google/genai";
import { ContentIntent, VisualStyle, BrandContext } from "../types";
import { STYLE_CONFIGS, FONT_DESCRIPTIONS } from "../constants";

// ─── Utilities ───────────────────────────────────────────────

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

const cleanJSON = (text: string) => {
  if (!text) return "{}";
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    return text.substring(firstBrace, lastBrace + 1);
  }
  return text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
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

// ─── Safe Fallback (when all models fail) ────────────────────

const getSafeFallback = (prompt: string, style: string, brand: BrandContext, type: string, slideCount: number = 6): any => {
  const brandName = brand.name || 'Tu Marca';
  const niche = brand.niche || 'tu negocio';
  const audience = brand.targetAudience || 'clientes';

  const allSlides = [
    {
      headline: `¿Sigues haciendo lo *mismo* esperando resultados diferentes?`,
      subHeadline: `El 87% de ${audience} en ${niche} pierden tiempo por no tener un sistema probado.`,
      visualPrompt: `Professional cinematic scene, person looking frustrated at laptop in modern office, dramatic side lighting, dark moody tones, 4K photorealistic`,
      layout: "centered",
      angleLabel: "GANCHO"
    },
    {
      headline: "El *problema* que nadie te cuenta",
      subHeadline: `Mientras siguen con métodos obsoletos en ${niche}, los líderes ya cambiaron.`,
      visualPrompt: `Close-up of hands gripping desk in frustration, shallow depth of field, warm dramatic lighting, editorial photography style`,
      layout: "bottom-heavy",
      angleLabel: "DOLOR"
    },
    {
      headline: `*${brandName}* lo cambia todo`,
      subHeadline: `Una solución diseñada para ${niche} que elimina la complejidad y multiplica resultados.`,
      visualPrompt: `Bright modern workspace, person smiling confidently at screen showing growth metrics, clean minimalist environment, natural light`,
      layout: "centered",
      angleLabel: "SOLUCIÓN"
    },
    {
      headline: "*3x* más resultados, la mitad de tiempo",
      subHeadline: `${audience} como tú ya transformaron su rendimiento con nuestro método.`,
      visualPrompt: `Celebration moment, professional achievement, growth chart going up on screen, golden hour warm lighting, inspiring atmosphere`,
      layout: "top-heavy",
      angleLabel: "PRUEBA"
    },
    {
      headline: "Tu competencia ya *empezó*",
      subHeadline: `Cada día que esperas, alguien más en ${niche} toma tu lugar.`,
      visualPrompt: `Dynamic competitive scene, person walking forward with determination, urban modern setting, cinematic dramatic lighting`,
      layout: "centered",
      angleLabel: "URGENCIA"
    },
    {
      headline: "Empieza *hoy*, ve resultados *mañana*",
      subHeadline: `Sin compromisos. Solo resultados medibles para ${audience}.`,
      cta: "QUIERO EMPEZAR",
      visualPrompt: `Clean call-to-action scene, confident person reaching hand toward camera, bright hopeful lighting, modern tech environment`,
      layout: "bottom-heavy",
      angleLabel: "CTA"
    }
  ];

  const targetCount = type === 'single-image' ? 1 : Math.min(slideCount, allSlides.length);
  const slides = Array.from({ length: targetCount }, (_, i) => allSlides[i % allSlides.length]);

  return {
    title: `Campaña ${brandName} — ${niche}`,
    designTheme: {
      primaryColor: "#0a0a0a",
      accentColor: "#f97316",
      headlineFont: "font-brand",
      subHeadlineFont: "font-modern"
    },
    slides
  };
};

// ─── Enhance Prompt ──────────────────────────────────────────

export const enhancePrompt = async (rawPrompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout(
    ai.models.generateContent({
      model: "models/gemini-2.5-flash",
      contents: [{ parts: [{ text: `Optimiza este brief publicitario para que la IA genere mejores imágenes y textos de venta. Mantén el mismo objetivo de negocio, agrega contexto visual y emocional. Responde SOLO con el prompt optimizado en español.\n\nBrief original: "${rawPrompt}"` }] }],
    }),
    15000,
    "Enhance Prompt Timeout"
  );
  const result = response.text?.trim();
  if (!result) throw new Error("La IA no devolvió un prompt optimizado.");
  return result;
};

// ─── Generate Ad Copy ────────────────────────────────────────

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

  const targetSlides = type === 'single-image' ? 1 : (type === 'angles-batch' ? 6 : slideCount);

  // ── System instruction: conciso y efectivo ──
  let sysInstruction = `Eres un copywriter de respuesta directa experto en publicidad de alto impacto.
Tu trabajo: interpretar el brief creativo del usuario y crear copy publicitario profesional en español que venda.

MARCA:
- Nombre: ${brandContext.name || '(sin nombre)'}
- Nicho: ${brandContext.niche || '(sin nicho)'}
- Audiencia: ${brandContext.targetAudience || '(general)'}
- Tono: ${brandContext.tone || 'Profesional y Persuasivo'}
${brandContext.brandPersonality ? `- Personalidad: ${brandContext.brandPersonality}` : ''}
${brandContext.colorPalette ? `- Paleta de colores: ${brandContext.colorPalette}` : ''}

REGLAS:
1. TODO en español. Headlines máximo 10 palabras. SubHeadlines máximo 25 palabras.
2. El prompt del usuario es un BRIEF CREATIVO — NUNCA lo copies literalmente. Crea copy ORIGINAL de venta.
3. Cada headline debe parar el scroll: curiosidad, dolor, promesas audaces o números específicos.
4. Usa *asteriscos* alrededor de UNA palabra clave por headline para énfasis visual.
5. CTAs que creen urgencia o reduzcan fricción (ej: "Agenda tu llamada gratis").
6. Los visualPrompts deben estar en INGLÉS y describir escenas visuales detalladas para generación de imagen.
${brandContext.colorPalette ? `7. Incorpora la paleta de colores de marca en los visualPrompts.` : ''}

BRIEF CREATIVO DEL USUARIO: "${prompt}"
`;

  // ── Instrucciones por modo ──
  if (type === 'single-image') {
    sysInstruction += `\nGENERA EXACTAMENTE 1 slide publicitario. El array 'slides' debe tener SOLO 1 elemento.`;
  } else if (type === 'angles-batch') {
    sysInstruction += `\nGENERA EXACTAMENTE 6 variaciones con ángulos diferentes: Dolor, Deseo, Romper Objeción, Lógica, Urgencia, Creativo. Cada headline con un enfoque completamente distinto. Incluye angleLabel para cada uno.`;
  } else {
    sysInstruction += `\nGENERA EXACTAMENTE ${targetSlides} slides con narrativa continua: gancho → problema → solución → beneficio → prueba → CTA.
COHERENCIA VISUAL: Todos los slides deben sentirse como parte de la MISMA campaña — mismo estilo visual, personajes consistentes, paleta de colores uniforme. Cada visualPrompt debe describir con detalle la escena (las imágenes de carrusel NO llevan texto superpuesto).`;
  }

  sysInstruction += `\n\nEl campo 'slides' del JSON debe tener EXACTAMENTE ${targetSlides} elemento(s).`;

  // ── Referencias visuales ──
  if (styleReference) {
    sysInstruction += `\nREFERENCIA DE ESTILO: Se proporcionan imágenes de referencia visual. Analiza su paleta de colores, tipografía y atmósfera. Aplica ese mismo ADN visual en los visualPrompts de cada slide.`;
  }

  if (characterReference) {
    sysInstruction += `\nPERSONAJE: Se proporciona foto de referencia de una persona. Mantén su identidad facial en todos los slides pero VARÍA la pose, expresión, ángulo de cámara y situación en cada uno. Describe la pose específica en cada visualPrompt.`;
  }

  if (knowledgeBase) {
    sysInstruction += `\n\nCONTEXTO ADICIONAL DE LA MARCA:\n${knowledgeBase}`;
  }

  // ── Content parts: images first, then text ──
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

  // ── JSON schema ──
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

  // ── Model cascade (2 models) ──
  const models = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-flash-lite",
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

      if (parsed?.slides?.length > 0 && parsed.slides[0]?.headline) {
        const h = parsed.slides[0].headline.toLowerCase().replace(/[*_]/g, '');
        const promptWords = prompt.toLowerCase().trim();
        const isLiteral = promptWords.length > 10 && (
          h.includes(promptWords) ||
          h.startsWith(promptWords.slice(0, 20))
        );
        if (!isLiteral) {
          return parsed;
        }
        console.warn(`${model} returned literal copy, trying next model...`);
      } else {
        console.warn(`${model} returned empty/no slides, trying next model...`);
      }
    } catch (err: any) {
      console.warn(`${model} copy gen failed:`, err.message);
    }
  }

  return getSafeFallback(prompt, style, brandContext, type, slideCount);
};

// ─── Generate Slide Image ────────────────────────────────────

export const generateSlideImage = async (
  visualPrompt: string,
  style: VisualStyle,
  aspectRatio: string = "4:5",
  options: {
    characterReference?: string | string[];
    styleReference?: string | string[];
    headline?: string;
    subHeadline?: string;
    headlineFont?: string;
    brandColors?: string;
  } = {}
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const { characterReference, styleReference, headline, subHeadline, headlineFont, brandColors } = options;

  // ── Build prompt by sections ──
  const sections: string[] = [];

  // Section 1: Style direction
  if (styleReference) {
    sections.push("Match the visual style, color palette, lighting and mood of the provided reference images.");
  } else {
    const hint = STYLE_CONFIGS[style]?.hint || 'professional advertising photography';
    sections.push(`Visual style: ${hint}.`);
  }

  // Section 2: Core visual scene
  sections.push(visualPrompt);

  // Section 3: Text baking OR no-text
  const cleanHeadline = headline?.replace(/[*_]/g, '').trim();
  const cleanSubHeadline = subHeadline?.replace(/[*_]/g, '').trim();

  if (cleanHeadline && cleanHeadline.length > 0) {
    const fontDesc = FONT_DESCRIPTIONS[headlineFont || 'font-sans'] || 'bold sans-serif';
    let textSection = `TEXT ON IMAGE:\nMain headline (large, bold, dominant): "${cleanHeadline}"`;
    if (cleanSubHeadline && cleanSubHeadline.length > 0) {
      textSection += `\nSubtitle (smaller, below headline): "${cleanSubHeadline}"`;
    }
    textSection += `\nTypography: ${fontDesc}, premium advertising poster, high contrast against background. Render text exactly once in one area.`;
    sections.push(textSection);
  } else {
    sections.push("This image must contain zero text, letters, words, or typography of any kind.");
  }

  // Section 4: Character reference instruction
  if (characterReference) {
    sections.push("Maintain this person's facial identity from the reference photo. Use a completely different pose, expression and camera angle than the reference.");
  }

  // Section 5: Brand colors
  if (brandColors) {
    sections.push(`Color palette: ${brandColors}.`);
  }

  // Section 6: Technical
  sections.push(`Aspect ratio: ${aspectRatio}. Professional advertising quality, high-end production.`);

  const fullPrompt = sections.join('\n\n');

  // ── Content parts: reference images first, then prompt ──
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

  contentParts.push({ text: fullPrompt });

  // ── Model cascade: Nano Banana 2 first ──
  const imgModels = [
    'models/gemini-3.1-flash-image-preview',   // Nano Banana 2 — fast + best text
    'models/gemini-3-pro-image-preview',       // Nano Banana Pro — highest quality
    'models/gemini-2.5-flash-image',           // Nano Banana — speed fallback
  ];

  const configObj: any = {
    responseModalities: ['TEXT', 'IMAGE'],
    aspectRatio: aspectRatio
  };

  for (const model of imgModels) {
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
        break;
      } catch (err: any) {
        const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || String(err.status) === '503';
        if (is503 && attempt === 0) {
          console.warn(`${model} 503 — will retry in 3s`);
          continue;
        }
        console.warn(`${model} image gen failed:`, err.message);
        if (err.message?.includes("API key not valid") || String(err.status) === "403" || err.message?.includes("401")) {
          throw err;
        }
        break;
      }
    }
  }

  throw new Error("ALL_IMAGE_MODELS_FAILED");
};

// ─── Regenerate Slide Copy ───────────────────────────────────

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
    0: "apertura/gancho",
    1: "problema/dolor",
    2: "solución",
    3: "prueba/beneficio",
    4: "cierre/CTA"
  };
  const position = positionMap[slideIndex] || `slide ${slideIndex + 1} de ${totalSlides}`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: "models/gemini-2.5-flash",
      contents: [{ parts: [{ text: `Reescribe el copy publicitario para este slide. Todo en español.

Campaña: ${projectGoal}
Posición: ${position}
Headline actual: "${currentHeadline}"
Intención: ${intent}

Crea un headline MÁS IMPACTANTE (max 10 palabras), un subHeadline que lo amplifica, y un CTA de acción.
Usa *asteriscos* en UNA palabra clave del headline.

Devuelve SOLO JSON: {"headline": "...", "subHeadline": "...", "cta": "..."}` }] }],
      config: { responseMimeType: "application/json" }
    }),
    15000,
    "Regenerate Copy Timeout"
  );
  return JSON.parse(cleanJSON(response.text || '{}'));
};

// ─── Magic Rewrite ───────────────────────────────────────────

export const magicRewrite = async (text: string, tone: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "models/gemini-2.5-flash-lite",
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

// ─── Edit Image ──────────────────────────────────────────────

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.split(',')[1] || base64Image;

  const editModels = [
    'models/gemini-3.1-flash-image-preview',
    'models/gemini-3-pro-image-preview',
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

// ─── Generate Visual Prompt for Manual Carousel ──────────────

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
  const styleHint = STYLE_CONFIGS[style]?.hint || 'professional advertising photography';
  const position = slideIndex === 0 ? 'opening/hook'
    : slideIndex === totalSlides - 1 ? 'closing/CTA'
    : `slide ${slideIndex + 1} of ${totalSlides}`;

  const response = await withTimeout(
    ai.models.generateContent({
      model: "models/gemini-2.5-flash",
      contents: [{ parts: [{ text: `Generate a detailed visual prompt in English for an advertising image.

Slide position: ${position}
Headline: "${headline}"
SubHeadline: "${subHeadline}"
Brand: ${brandContext.name || 'brand'} (${brandContext.niche || 'business'})
Style: ${styleHint}
${overallBrief ? `Context: ${overallBrief}` : ''}
${brandContext.colorPalette ? `Colors: ${brandContext.colorPalette}` : ''}

Return ONLY the visual prompt in English. Max 2 sentences. No text in the image.` }] }],
    }),
    15000,
    "Visual Prompt Generation Timeout"
  );
  return response.text?.trim() || `Professional advertising scene for ${brandContext.niche || 'business'}, ${styleHint}, high-end production quality`;
};

// ─── Generate Video (stub) ───────────────────────────────────

export const generateVideo = async (prompt: string, images: string[]): Promise<string> => {
  console.log("Video generation not implemented in this version.");
  return "";
};
