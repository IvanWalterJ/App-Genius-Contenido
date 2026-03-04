
import React, { useRef } from 'react';
import { Slide, VisualStyle, AspectRatio } from '../types';
import { ImageOff } from 'lucide-react';

interface SlideCardProps {
  slide: Slide;
  visualStyle: VisualStyle;
  accentGradient: string;
  accentColor?: string;
  brandHandle?: string;
  index: number;
  isEditing: boolean;
  onPositionChange?: (x: number, y: number) => void;
  aspectRatio: AspectRatio;
  showSafeZones: boolean;
  textMode: 'overlay' | 'baked';
  id?: string;
  hideNumbering?: boolean;
}

const SlideCard: React.FC<SlideCardProps> = ({
  slide, aspectRatio, showSafeZones, id, index
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, h] = aspectRatio.split(':').map(Number);

  // Image Filters style
  const imageFilterStyle = {
    filter: `brightness(${slide.imageBrightness}%) contrast(${slide.imageContrast}%) saturate(${slide.imageSaturation}%) blur(${slide.imageBlur}px)`
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-neutral-950 overflow-hidden shadow-2xl select-none"
      style={{ aspectRatio: `${w}/${h}`, containerType: 'inline-size' }}
      id={id || `slide-export-${index}`}
    >
      {/* ── Background (Image/Video with Baked Text) ─────────────────── */}
      {slide.videoUrl ? (
        <video
          src={slide.videoUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          style={imageFilterStyle}
        />
      ) : slide.backgroundImageUrl
        ? <img src={slide.backgroundImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={imageFilterStyle} draggable={false} />
        : slide.backgroundImageUrl === null
          ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-25">
            <ImageOff className="w-7 h-7" />
            <span className="text-[9px] font-mono tracking-widest uppercase text-white">Error de imagen</span>
          </div>
          : <div className="absolute inset-0 bg-neutral-800">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-950 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-9 h-9 border-4 border-white/10 border-t-white/50 rounded-full animate-spin" />
            </div>
          </div>
      }

      {/* ── SAFE ZONES (Optional visual guide) ────────────────────────── */}
      {showSafeZones && (
        <div className="absolute inset-0 pointer-events-none z-50 safe-zone-overlay">
          <div className="absolute inset-5 border border-dashed border-cyan-400/60 rounded" />
          {aspectRatio === '9:16' && (
            <>
              <div className="absolute right-1 bottom-16 w-[14%] h-[34%] bg-red-500/10 border border-red-400/30 rounded" />
              <div className="absolute bottom-0 left-0 w-full h-[15%] bg-red-500/10 border-t border-red-400/30 flex items-center justify-center">
                <span className="text-[8px] font-bold text-red-300/70 tracking-widest uppercase">Zona Caption</span>
              </div>
            </>
          )}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-white/50 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default SlideCard;
