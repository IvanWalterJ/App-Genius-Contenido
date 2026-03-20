
import { VisualStyle } from './types';

export const STYLE_CONFIGS: Record<VisualStyle, {
  name: string;
  desc: string;
  hint: string;
}> = {
  'auto': {
    name: 'AUTO (IA Libre)',
    desc: 'La IA elige el mejor estilo visual según tu marca y objetivo.',
    hint: 'professional advertising photography'
  },
  'editorial': {
    name: 'Editorial',
    desc: 'Estilo revista, editorial de moda o lifestyle premium.',
    hint: 'editorial fashion photography'
  },
  'bold': {
    name: 'Impacto',
    desc: 'Alto contraste, colores saturados, rompe el scroll.',
    hint: 'bold high-contrast graphic design'
  },
  'minimal': {
    name: 'Minimal',
    desc: 'Limpio, mucho espacio negativo, profesional.',
    hint: 'clean minimalist design'
  },
  'cinematic': {
    name: 'Cinemático',
    desc: 'Iluminación dramática, atmósfera de película.',
    hint: 'cinematic dramatic lighting'
  }
};

export const FONT_DESCRIPTIONS: Record<string, string> = {
  'font-sans': 'clean sans-serif',
  'font-brand': 'geometric sans-serif like Montserrat',
  'font-display': 'condensed uppercase display font',
  'font-serif': 'elegant serif like Playfair Display',
  'font-oswald': 'narrow condensed sans-serif',
  'font-modern': 'rounded modern sans-serif like Poppins',
  'font-merriweather': 'traditional serif',
  'font-hand': 'casual handwritten',
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
