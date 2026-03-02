
export type GenerationMode = 'single-image' | 'carousel' | 'angles-batch';
export type ContentIntent = 'paid-ads' | 'organic-value' | 'viral-hook';
export type VisualStyle = 'brutalism' | 'neon' | 'clean' | 'organic' | 'pop-art' | 'luxury' | 'meme' | '3d-clay';
export type AspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4';
export type GenerationStatus = 'idle' | 'generating-copy' | 'generating-visuals' | 'done' | 'error';

export interface BrandContext {
  name: string;
  niche: string;
  targetAudience: string;
  tone: string;
}

export interface Slide {
  id: string;
  headline: string;
  subHeadline: string;
  cta?: string;
  visualPrompt: string;
  backgroundImageUrl?: string | null;
  imageError?: string;

  // Layout & Styling
  layout: 'centered' | 'bottom-heavy' | 'top-heavy' | 'split-vertical';
  textAlign: 'left' | 'center' | 'right';
  textPosition: { x: number, y: number };
  overlayOpacity: number;

  // Typography
  headlineSize: number;
  headlineColor: string;
  headlineFont?: string;
  headlineLineHeight: number;
  headlineFontWeight: string;
  headlineGradient?: string | null;
  headlineBgColor?: string | null;

  highlightColor: string;
  highlightFont?: string;
  highlightFontWeight?: string;

  subHeadlineSize: number;
  subHeadlineColor: string;
  subHeadlineFont?: string;
  subHeadlineLineHeight?: number;
  subHeadlineFontWeight?: string;

  // CTA
  ctaColor?: string;
  ctaBgColor?: string;
  ctaBgGradient?: string | null;
  ctaFont?: string;
  ctaRoundness?: number;
  ctaShadow?: boolean;

  // Image Adjustments
  imageBrightness: number;
  imageContrast: number;
  imageSaturation: number;
  imageBlur: number;

  angleLabel?: string;
  videoUrl?: string | null;
  isWinner?: boolean;
}

export interface AdProject {
  id: string;
  createdAt: number;
  title: string;
  goal: string;
  intent: ContentIntent;
  mode: GenerationMode;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  textMode: 'overlay' | 'baked';
  brandContext?: BrandContext;

  designTheme?: {
    primaryColor: string;
    accentColor: string;
    headlineFont: string;
    subHeadlineFont?: string;
    ctaBgColor?: string;
    ctaColor?: string;
  };

  primaryColor: string;
  accentColor: string;
  accentGradient: string;
  brandHandle?: string;

  slides: Slide[];
}
