
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
  // NEVER use the raw prompt as copy. Only use brand context or generic marketing angles.
  const brandName = brand.name || 'Tu Marca';
  const niche = brand.niche || 'tu negocio';
  const audience = brand.targetAudience || 'clientes';

  const allSlides = [
    {
      headline: `¿Sigues haciendo lo *mismo* y esperando resultados diferentes?`,
      subHeadline: `El 87% de ${audience} en ${niche} pierden tiempo y dinero por no tener un sistema probado. Tú puedes ser diferente.`,
      visualPrompt: `High-end professional atmosphere, cinematic dramatic lighting, modern office environment, premium aesthetic, 4K photorealistic`,
      layout: "centered",
      angleLabel: "GANCHO"
    },
    {
      headline: "El *problema* que nadie te cuenta",
      subHeadline: `Mientras ${audience} siguen con métodos obsoletos en ${niche}, los que lideran ya cambiaron su estrategia.`,
      visualPrompt: `Metaphorical image about frustration and challenges, person looking at complex data, professional cinematic lighting, dark moody tones`,
      layout: "bottom-heavy",
      angleLabel: "DOLOR"
    },
    {
      headline: `*${brandName}*: El sistema que lo cambia todo`,
      subHeadline: `Diseñamos una solución específica para ${niche} que elimina la complejidad y multiplica tus resultados.`,
      visualPrompt: `Bright futuristic success imagery, clean minimalist design, person celebrating achievement, premium 4K quality`,
      layout: "centered",
      angleLabel: "SOLUCIÓN"
    },
    {
      headline: "*3x* más resultados en la mitad de tiempo",
      subHeadline: `${audience} como tú ya lograron transformar su rendimiento en ${niche} con nuestro método comprobado.`,
      visualPrompt: `Professional achievement celebration, growth charts going up, warm golden hour lighting, inspiring atmosphere`,
      layout: "top-heavy",
      angleLabel: "PRUEBA"
    },
    {
      headline: "Tu competencia ya *empezó*",
      subHeadline: `Cada día que esperas, alguien más en ${niche} toma tu lugar. La ventana de oportunidad se cierra.`,
      visualPrompt: `Dynamic competitive scene, person running ahead, dramatic cinematic lighting, urgency atmosphere`,
      layout: "centered",
      angleLabel: "URGENCIA"
    },
    {
      headline: "Empieza *hoy*, ve resultados *mañana*",
      subHeadline: `Sin compromisos. Sin letra chica. Solo resultados medibles para ${audience} en ${niche}.`,
      cta: "QUIERO EMPEZAR",
      visualPrompt: `Clean call-to-action scene, person confidently pressing button, modern tech environment, bright hopeful lighting`,
      layout: "bottom-heavy",
      angleLabel: "CIERRE"
    },
    {
      headline: "¿Por qué *nosotros* y no otro?",
      subHeadline: `Más de 1,000 ${audience} en ${niche} ya confían en ${brandName}. Resultados comprobados, sin excusas.`,
      visualPrompt: `Trust and credibility imagery, team of professionals, clean modern studio, professional lighting`,
      layout: "centered",
      angleLabel: "AUTORIDAD"
    },
    {
      headline: "Lo que *nadie* te está diciendo sobre ${niche}",
      subHeadline: `Los líderes del sector lo saben y lo aplican cada día. ¿Estás listo para descubrirlo?`,
      visualPrompt: `Mysterious reveal concept, dramatic spotlight, secrets being unveiled, cinematic dark lighting with golden accents`,
      layout: "centered",
      angleLabel: "CURIOSIDAD"
    },
    {
      headline: "De *0 a líder* en su categoría",
      subHeadline: `Un caso real: cómo ${audience} en ${niche} pasó de la frustración a facturar 5 cifras mensuales.`,
      visualPrompt: `Success transformation before/after concept, warm celebratory golden hour lighting, professional environment`,
      layout: "top-heavy",
      angleLabel: "SOCIAL PROOF"
    },
    {
      headline: "Últimas *plazas* disponibles",
      subHeadline: `Cupo limitado. El precio cambia pronto. Actúa ahora o pierde tu ventaja en ${niche}.`,
      cta: "RESERVAR MI LUGAR",
      visualPrompt: `Urgency and scarcity concept, countdown timer, red and gold dramatic composition, high stakes atmosphere`,
      layout: "bottom-heavy",
      angleLabel: "URGENCIA"
    }
  ];

  const targetCount = type === 'single-image' ? 1 : Math.min(slideCount, allSlides.length);
  // If we need more slides than available templates, cycle through them
  const slides = Array.from({ length: targetCount }, (_, i) => allSlides[i % allSlides.length]);

  return {
    title: `Campaña ${brandName} — ${niche}`,
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
  
  ## ⚠️ REGLA #1 — PROHIBIDO COPIAR EL TEXTO DEL USUARIO LITERALMENTE
  El texto del usuario es SOLO un BRIEF CREATIVO, una IDEA, una DIRECCIÓN. Tu trabajo como Director Creativo es:
  1. INTERPRETAR la idea del usuario y ENTENDER qué producto/servicio quiere promocionar
  2. CREAR TU PROPIO COPY PROFESIONAL desde cero, usando ángulos de venta, gatillos emocionales y técnicas de respuesta directa
  3. NUNCA JAMÁS uses las palabras exactas del usuario como headline o subheadline. El usuario te da la idea, TÚ creas el copy de venta.
  
  Ejemplo: Si el usuario dice "Necesito un anuncio para mi app de copywriting con IA", TÚ debes crear un headline como "Escribe anuncios que venden en 30 segundos" o "La IA que convierte tus ideas en copys que facturan" — NO "Crea una app de copywriting con IA".
  
  ## BRIEF CREATIVO DEL USUARIO (INTERPRETA, NO COPIES):
  El usuario quiere promocionar algo relacionado con: "${prompt}"
  Usa esto como CONTEXTO para entender el producto/servicio/nicho. Luego INVENTA copy publicitario profesional que VENDA, atacando los dolores y deseos del público objetivo.

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
  8. NUNCA repitas el prompt del usuario en los headlines. Crea copy ORIGINAL de venta.
  ${brandContext.colorPalette ? `9. En los visualPrompts de imagen, incorpora la paleta de colores de marca: ${brandContext.colorPalette}` : ''}
  
  ${brandContext.tone ? `## TONO ESPECÍFICO: ${brandContext.tone} — que esto se SIENTA en cada palabra.` : ''}
  - HeadlineSize sugeridos: 40-70 para Single, 35-50 para Carrusel.
  - RECUERDA: El copy DEBE ser inventado por TI como profesional. El usuario NO te está dando el texto, te está dando la IDEA.
  `;

  if (styleReference) {
    sysInstruction += `\nESTILO VISUAL Y TIPOGRÁFICO DE REFERENCIA: Se ha proporcionado una imagen de marca. Analízala y extrae:
    1. Paleta de colores dominante y acentos.
    2. Identificación de Tipografía: si es sans-serif moderna, serif elegante, manuscrita, etc.
    3. Atmósfera: minimalista, vibrante, oscura, corporativa, etc.
    APLICA este mismo ADN visual a toda la campaña. Es fundamental que el resultado final sea consistente con esta referencia de diseño.`;
  }

  if (characterReference) {
    sysInstruction += `\nPERSONAJE DE REFERENCIA: Se ha proporcionado una foto de referencia de una persona. IMPORTANTE:
    - IDENTIDAD: Mantén la MISMA cara, rasgos faciales, color de piel, tipo de cabello y complexión física.
    - VARIACIÓN OBLIGATORIA: En cada slide, pon al personaje en DIFERENTE pose, expresión, ángulo de cámara y situación.
    - Ejemplos: sonriendo en una, seria y profesional en otra, mirando su laptop, hablando con un cliente, señalando algo, de perfil, primer plano, plano medio, etc.
    - NUNCA generes la misma pose ni el mismo ángulo de cara en dos slides. La foto de referencia es solo para capturar la IDENTIDAD, no para CLONAR la pose.
    - En los visualPrompts de cada slide, describe ESPECÍFICAMENTE la pose y expresión que quieres para ese slide.`;
  }

  const hasSlideMarkers = /slide \d+/i.test(prompt) || /\[slide \d+\]/i.test(prompt);

  if (type === 'angles-batch') {
    sysInstruction += `\nTarea: Generar EXACTAMENTE 6 variaciones visuales de ALTO IMPACTO (Ángulos: Dolor, Deseo, Romper Objeción, Lógica, Urgencia, Creativo). Cada una con un ángulo completamente diferente. Inspírate en: "${prompt}". Output JSON.`;
  } else if (type === 'single-image') {
    sysInstruction += `\nTarea: Generar EXACTAMENTE 1 sola imagen publicitaria. El array 'slides' debe tener SOLO 1 elemento. Output JSON.`;
  } else {
    sysInstruction += `\nTarea: Crear un carrusel de EXACTAMENTE ${targetSlides} slides con narrativa continua (hook→problema→solución→beneficio→prueba→CTA). Output JSON con ${targetSlides} items en el array 'slides'.
    
## COHERENCIA VISUAL OBLIGATORIA PARA CARRUSEL:
Todos los slides deben sentirse como PARTE DE LA MISMA CAMPAÑA. Esto significa:
1. MISMO ESTILO VISUAL: Usa el mismo tipo de iluminación, paleta de colores, y estética en TODAS las slides.
2. PERSONAJES CONSISTENTES: Si hay una persona en el slide 1, esa MISMA persona (misma ropa, mismas características físicas) debe aparecer en las demás slides donde corresponda.
3. AMBIENTE COHERENTE: Mantén el mismo tipo de escenario/fondo o una progresión lógica del mismo.
4. CADA visualPrompt debe describir con EXTREMO detalle la escena visual, ya que las imágenes se generarán SIN texto superpuesto.
5. Los visualPrompts deben indicar explícitamente elementos de consistencia: "mismo personaje del slide anterior", "continuando la misma escena", etc.`;
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
      // Validate: has real slides, not generic, and not a literal copy of the prompt
      if (parsed?.slides?.length > 0 && parsed.slides[0]?.headline) {
        const h = parsed.slides[0].headline.toLowerCase().replace(/[*_]/g, '');
        const promptWords = prompt.toLowerCase().trim();
        const isGeneric = h.includes('tu sector') || h.includes('tu negocio');
        // Check if headline is literally just the prompt or starts with it
        const isLiteral = promptWords.length > 10 && (
          h.includes(promptWords) || 
          promptWords.includes(h.replace(/[^a-záéíóúñü\s]/g, '').trim()) ||
          h.startsWith(promptWords.slice(0, 20))
        );
        if (!isGeneric && !isLiteral) {
          return parsed;
        }
        console.warn(`${model} returned generic or literal copy, trying next model... Headline was: "${parsed.slides[0].headline}"`);
      } else {
        console.warn(`${model} returned empty/no slides, trying next model...`);
      }
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
  styleReference?: string | string[],
  headline?: string,
  subHeadline?: string,
  headlineFont?: string
): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let stylePrefix = customStyle || STYLE_CONFIGS[style]?.promptPrefix || "";

  let fullPrompt = `${stylePrefix} ${prompt}. Aspect ratio strictly ${aspectRatio}. Optimized for ${aspectRatio} viewport. Professional photography, high end production.`;

  // TEXT BAKING: If headline is provided, bake text into the image (for single-image and volume modes)
  if (headline && headline.trim()) {
    fullPrompt += `\n\nTEXT ON IMAGE (MANDATORY):
You MUST render the following text DIRECTLY ON the image as part of the design. The text must be:
- PERFECTLY LEGIBLE, with zero spelling errors
- Styled as premium advertising typography
- Font style: ${headlineFont || 'bold sans-serif, modern and clean'}
- Use high contrast against the background for readability
- HEADLINE (large, bold, dominant): "${headline}"`;
    if (subHeadline && subHeadline.trim()) {
      fullPrompt += `\n- SUB-HEADLINE (smaller, below the headline): "${subHeadline}"`;
    }
    fullPrompt += `\nThe text IS the centerpiece of this ad visual. It must look like a professional advertising poster with integrated typography.`;
  } else {
    // CAROUSEL MODE: Explicitly prohibit any text
    fullPrompt += `\n\nCRITICAL: Do NOT include ANY text, words, letters, numbers, watermarks, or typography in this image. This is a VISUAL-ONLY image. Generate ONLY the visual scene described above with ZERO text elements.`;
  }

  if (characterReference) {
    fullPrompt += ` CHARACTER IDENTITY REFERENCE: Use the reference photo ONLY to capture the person's IDENTITY (face shape, skin tone, hair type, facial features). However, you MUST generate the person in a COMPLETELY DIFFERENT pose, expression, camera angle, and body position than the reference photo. The person should look natural and dynamic in the scene described — NOT a static clone of the reference. Vary head tilt, gaze direction, facial expression, and body language.`;
  }

  // Image generation models — ordered by quality/availability
  // When text is baked, prioritize nano-banana (best text rendering)
  const imgModels = (headline && headline.trim()) ? [
    'models/nano-banana-2-pro-preview',
    'models/gemini-3.1-flash-image-preview',
    'models/gemini-2.5-flash-image',
  ] : [
    'models/gemini-3.1-flash-image-preview',
    'models/nano-banana-2-pro-preview',
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
