
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
  'auto': {
    promptPrefix: 'Dynamic professional creative advertising, high end photography, consistent visual identity. ',
    defaultOverlay: 0.5,
    name: 'AUTO (IA Libre)',
    desc: 'Deja que la IA elija el mejor estilo visual según tu nicho y público objetivo.',
    preview: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'cinematic-thriller': {
    promptPrefix: 'Gritty cinematic portrait photography, thriller movie poster aesthetic, dramatic split lighting. Bold warped elegant serif typography for main title, modern sans-serif subtitles, high contrast white text over dark areas, intricate typographic layout with varying font sizes, raw emotional realism. ',
    defaultOverlay: 0.6,
    name: 'Cinematic Thriller',
    desc: 'Retratos intensos y crudos con iluminación dramática. Ideal para romper el scroll con misterio y autoridad (Referencia Cansando).',
    preview: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'tech-agency': {
    promptPrefix: 'High-end B2B tech workspace, glowing laptop, dark navy room, amber desk lamp. Extremely clean geometric sans-serif typography, large centered title with a single colored accent word, pill-shaped UI badges for subtitles, polished digital ad layout, sleek luxury tech branding. ',
    defaultOverlay: 0.6,
    name: 'Dark Tech Desk',
    desc: 'Entornos profesionales de noche, iluminados por pantallas y lámparas cálidas (Referencia Advertise Precision).',
    preview: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'mystic-neon': {
    promptPrefix: 'Surreal dark 3D composition, intense violet and magenta lighting, glowing mystical elements. Massive bold sans-serif headline with a stark white inner glow at the bottom center, smaller elegant subtitles underneath, heavy compositing, high-end editorial graphic design. ',
    defaultOverlay: 0.5,
    name: 'Mystic Flow',
    desc: 'Composiciones mágicas y surreales con fuerte luz violeta, como renders 3D de alta gama (Referencia Dinheiro).',
    preview: 'https://images.unsplash.com/photo-1567007798363-228cf0bfeb4a?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'satirical-split': {
    promptPrefix: 'Split screen composition layout, studio portrait photography, humorous before-and-after comparison. Large clean modern web sans-serif header across the top, high contrast typography on a split dark/light grey background, billboard advertisement typographic hierarchy, highly polished. ',
    defaultOverlay: 0.2,
    name: 'Satirical Compare',
    desc: 'Composiciones en pantalla dividida o formato "Mugshot". Altamente efectivo para contrastes y humor visual (Referencia Ad-ichu).',
    preview: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'cyber-glow': {
    promptPrefix: 'Dark UI graphic design aesthetic, wireframe background grids, glowing neon yellow outlines. Very heavy bold display typography, bold stylistic headers, floating pill-shaped text bubbles, high contrast yellow and white text layout, strictly technological vector aesthetic. ',
    defaultOverlay: 0.8,
    name: 'Neon Grid UI',
    desc: 'Gráficos vectoriales oscuros con fuerte resplandor (glow) y grillas. Ideal para datos curiosos o tech (Referencia Did you know).',
    preview: 'https://images.unsplash.com/photo-1614729939124-032f0b56c4ce?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'brutalism': {
    promptPrefix: 'Brutalist graphic design, high contrast, raw unedited photography style, harsh flash photography, bold composition, disruptive, scroll-stopping, highly saturated accents. ',
    defaultOverlay: 0.4,
    name: 'Brutalismo',
    desc: 'Crudo, directo, alto contraste. Ideal para romper el patrón visual y captar atención inmediata.',
    preview: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'neon': {
    promptPrefix: 'Cyberpunk aesthetic, dark background, glowing neon accents, highly stylized, futuristic, moody lighting, high end 3d render style. ',
    defaultOverlay: 0.6,
    name: 'Neon Cyber',
    desc: 'Oscuro con acentos brillantes. Perfecto para nichos tech, gaming o marketing moderno.',
    preview: 'https://images.unsplash.com/photo-1563205762-f8b1bbdc51ac?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'clean': {
    promptPrefix: 'Ultra clean corporate aesthetic, minimalist, lots of negative space, bright soft lighting, professional photography, trustworthy, modern SaaS style. ',
    defaultOverlay: 0.3,
    name: 'Corporate Clean',
    desc: 'Limpio, confiable y profesional. Excelente para B2B, finanzas o SaaS.',
    preview: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'organic': {
    promptPrefix: 'Earthy tones, soft natural sunlight, organic textures, lifestyle photography, authentic, warm, approachable, film camera aesthetic. ',
    defaultOverlay: 0.2,
    name: 'Orgánico',
    desc: 'Tonos tierra, luz natural. Conecta emocionalmente, ideal para salud, bienestar o marcas personales.',
    preview: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'pop-art': {
    promptPrefix: 'Pop art style, extremely vibrant colors, playful, energetic, highly saturated, bold graphic design layout. ',
    defaultOverlay: 0.4,
    name: 'Pop Art',
    desc: 'Colores vibrantes y energía. Para marcas jóvenes, e-commerce o productos de consumo.',
    preview: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'luxury': {
    promptPrefix: 'Dark luxury aesthetic, moody studio lighting, elegant, premium, high-end editorial fashion photography style, black and gold tones. ',
    defaultOverlay: 0.7,
    name: 'Dark Luxury',
    desc: 'Elegante y premium. Para real estate de lujo, high-ticket coaching o productos exclusivos.',
    preview: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=400&h=500'
  },
  'meme': {
    promptPrefix: 'Low-fi internet aesthetic, disposable camera flash, chaotic energy, relatable, unpolished, viral social media style, shitpost aesthetic, funny faces. ',
    defaultOverlay: 0.5,
    name: 'Viral / Low-fi',
    desc: 'Estética nativa de internet. Altísimo CTR por parecer contenido orgánico y no un anuncio.',
    preview: 'https://images.unsplash.com/photo-1506869640319-fea1a27e02c6?auto=format&fit=crop&q=80&w=400&h=500'
  },
  '3d-clay': {
    promptPrefix: '3D claymorphism render, soft matte materials, pastel colors, cute, friendly, smooth lighting, trendy UI illustration style. ',
    defaultOverlay: 0.3,
    name: '3D Clay',
    desc: 'Amigable y moderno. Muy popular en startups y apps B2C.',
    preview: 'https://images.unsplash.com/photo-1633420894548-2629b3d1b7ee?auto=format&fit=crop&q=80&w=400&h=500'
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
export const DISRUPTIVE_STYLES = [
  'Hyper-realistic 3D surrealism, floating objects, dreamlike atmosphere, liquid metal textures, impossible physics, vibrant neon contrast. ',
  'Retro-future synthwave, 80s movie poster aesthetic, heavy grain, chrome effects, deep purples and oranges, cinematic lighting. ',
  'Hand-drawn experimental charcoal sketch, raw energy, messy lines, high artistic value, black and white with one bold accent color. ',
  'Acid graphic design style, distorted typography, glitch effects, thermal camera colors, high energy, chaotic layout, maximalist. ',
  'Professional high-end fashion editorial, avant-garde, dramatic shadows, mysterious mood, unusual camera angles, vogue aesthetic. ',
  'Claymation/Stop-motion style, handcrafted tactile feel, imperfections, soft warm lighting, cute but slightly weird, colorful. ',
  'Dark technical blueprint style, vector lines, scientific diagrams, futuristic UI elements, industrial aesthetic, blueprint blue and white. ',
  'Vivid watercolor and ink splash, messy but elegant, street art influences, vibrant drips, mixed media collage style. '
];
