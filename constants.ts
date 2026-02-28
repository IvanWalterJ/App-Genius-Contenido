
import { VisualStyle } from './types';

export const COLOR_THEMES = [
  { name: 'Neon Cyber', primary: '#09090b', accent: '#22d3ee', gradient: 'linear-gradient(to right, #22d3ee, #3b82f6)' },
  { name: 'Brutal Red', primary: '#ffffff', accent: '#ef4444', gradient: 'linear-gradient(to right, #ef4444, #b91c1c)' },
  { name: 'Luxury Gold', primary: '#000000', accent: '#fbbf24', gradient: 'linear-gradient(to right, #fbbf24, #d97706)' },
  { name: 'Organic Green', primary: '#f8fafc', accent: '#10b981', gradient: 'linear-gradient(to right, #10b981, #047857)' },
  { name: 'Pop Pink', primary: '#18181b', accent: '#ec4899', gradient: 'linear-gradient(to right, #ec4899, #be185d)' },
];

export const STYLE_CONFIGS: Record<VisualStyle, { 
  promptPrefix: string, 
  defaultOverlay: number, 
  name: string, 
  desc: string,
  preview: string
}> = {
  'brutalism': { 
    promptPrefix: 'Brutalist graphic design, high contrast, raw unedited photography style, harsh flash, bold composition, disruptive, scroll-stopping, highly saturated accents. ', 
    defaultOverlay: 0.4,
    name: 'Brutalismo',
    desc: 'Crudo, directo, alto contraste. Ideal para romper el patrón visual y captar atención inmediata.',
    preview: 'https://picsum.photos/seed/brutal/400/500?grayscale&blur=2'
  },
  'neon': { 
    promptPrefix: 'Cyberpunk aesthetic, dark background, glowing neon accents, highly stylized, futuristic, moody lighting, high end 3d render style. ', 
    defaultOverlay: 0.6,
    name: 'Neon Cyber',
    desc: 'Oscuro con acentos brillantes. Perfecto para nichos tech, gaming o marketing moderno.',
    preview: 'https://picsum.photos/seed/neon/400/500'
  },
  'clean': { 
    promptPrefix: 'Ultra clean corporate aesthetic, minimalist, lots of negative space, bright soft lighting, professional photography, trustworthy, modern SaaS style. ', 
    defaultOverlay: 0.3,
    name: 'Corporate Clean',
    desc: 'Limpio, confiable y profesional. Excelente para B2B, finanzas o SaaS.',
    preview: 'https://picsum.photos/seed/clean/400/500'
  },
  'organic': { 
    promptPrefix: 'Earthy tones, soft natural sunlight, organic textures, lifestyle photography, authentic, warm, approachable, film camera aesthetic. ', 
    defaultOverlay: 0.2,
    name: 'Orgánico',
    desc: 'Tonos tierra, luz natural. Conecta emocionalmente, ideal para salud, bienestar o marcas personales.',
    preview: 'https://picsum.photos/seed/organic/400/500'
  },
  'pop-art': { 
    promptPrefix: 'Pop art style, extremely vibrant colors, comic book halftone patterns, playful, energetic, highly saturated, bold outlines. ', 
    defaultOverlay: 0.4,
    name: 'Pop Art',
    desc: 'Colores vibrantes y energía. Para marcas jóvenes, e-commerce o productos de consumo.',
    preview: 'https://picsum.photos/seed/pop/400/500'
  },
  'luxury': { 
    promptPrefix: 'Dark luxury aesthetic, moody studio lighting, elegant, premium, high-end editorial fashion photography style, black and gold tones. ', 
    defaultOverlay: 0.7,
    name: 'Dark Luxury',
    desc: 'Elegante y premium. Para real estate de lujo, high-ticket coaching o productos exclusivos.',
    preview: 'https://picsum.photos/seed/luxury/400/500'
  },
  'meme': { 
    promptPrefix: 'Low-fi internet aesthetic, disposable camera flash, chaotic energy, relatable, unpolished, viral social media style, shitpost aesthetic. ', 
    defaultOverlay: 0.5,
    name: 'Viral / Low-fi',
    desc: 'Estética nativa de internet. Altísimo CTR por parecer contenido orgánico y no un anuncio.',
    preview: 'https://picsum.photos/seed/meme/400/500'
  },
  '3d-clay': { 
    promptPrefix: '3D claymorphism render, soft matte materials, pastel colors, cute, friendly, smooth lighting, trendy UI illustration style. ', 
    defaultOverlay: 0.3,
    name: '3D Clay',
    desc: 'Amigable y moderno. Muy popular en startups y apps B2C.',
    preview: 'https://picsum.photos/seed/clay/400/500'
  }
};

export const FONT_OPTIONS = [
  { name: 'Inter (Sans)', value: 'font-sans' },
  { name: 'Montserrat (Brand)', value: 'font-brand' },
  { name: 'Bebas Neue (Display)', value: 'font-display' },
  { name: 'Playfair (Serif)', value: 'font-serif' },
  { name: 'Oswald (Impact)', value: 'font-oswald' },
  { name: 'Poppins (Modern)', value: 'font-modern' },
  { name: 'Merriweather (Classic)', value: 'font-merriweather' },
  { name: 'Patrick Hand (Casual)', value: 'font-hand' },
];
