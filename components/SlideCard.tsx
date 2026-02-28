
import React, { useRef, useState, useEffect } from 'react';
import { Slide, VisualStyle, AspectRatio } from '../types';
import { ImageOff, AtSign } from 'lucide-react';

interface SlideCardProps {
  slide: Slide;
  visualStyle: VisualStyle;
  accentGradient: string;
  accentColor?: string;
  brandHandle?: string;
  index: number;
  isEditing: boolean;
  onPositionChange: (x: number, y: number) => void;
  aspectRatio: AspectRatio;
  showSafeZones: boolean;
  textMode: 'overlay' | 'baked';
  id?: string;
  hideNumbering?: boolean;
}

const renderHeadline = (
  text: string,
  highlightColor: string,
  highlightFont: string | undefined,
  highlightWeight: string | undefined
) => {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span
          key={i}
          className={`${highlightFont || 'font-serif'} italic`}
          style={{
            color: highlightColor,
            fontWeight: (highlightWeight || '400') as any,
            display: 'inline',
            fontStyle: 'italic',
            // Reset gradient for highlight to ensure visibility
            backgroundImage: 'none',
            WebkitTextFillColor: 'initial',
            textShadow: 'none'
          }}
        >
          {part.slice(1, -1)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const SlideCard: React.FC<SlideCardProps> = ({
  slide, visualStyle, accentGradient, accentColor, brandHandle,
  index, isEditing, onPositionChange, aspectRatio, showSafeZones, textMode, id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localPos, setLocalPos] = useState(slide.textPosition);

  // Sync local pos with props unless dragging
  useEffect(() => {
    if (!isDragging) setLocalPos(slide.textPosition);
  }, [slide.textPosition, isDragging]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || textMode === 'baked') return;
    e.preventDefault();
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();

    // Calculate percentage position
    const newX = ((e.clientX - r.left) / r.width) * 100;
    const newY = ((e.clientY - r.top) / r.height) * 100;

    setLocalPos({
      x: Math.max(0, Math.min(100, newX)),
      y: Math.max(0, Math.min(100, newY)),
    });
  };

  const onMouseUp = () => { if (isDragging) { setIsDragging(false); onPositionChange(localPos.x, localPos.y); } };
  const onMouseLeave = () => { if (isDragging) { setIsDragging(false); onPositionChange(localPos.x, localPos.y); } };

  const [w, h] = aspectRatio.split(':').map(Number);
  const layout = slide.layout || 'bottom-heavy';

  // Image Filters style
  const imageFilterStyle = {
    filter: `brightness(${slide.imageBrightness}%) contrast(${slide.imageContrast}%) saturate(${slide.imageSaturation}%) blur(${slide.imageBlur}px)`
  };

  // Overlays
  const overlayGradients: Record<string, string> = {
    'bottom-heavy': 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)',
    'top-heavy': 'linear-gradient(to bottom, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 40%, transparent 100%)',
    'centered': 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.4) 100%)',
    'split-vertical': 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)',
  };

  // Dragging Styles
  const draggableContainerStyle: React.CSSProperties = textMode === 'overlay' ? {
    position: 'absolute',
    left: `${localPos.x}%`,
    top: `${localPos.y}%`,
    transform: 'translate(-50%, -50%)', // Center anchor
    width: '90%', // Default width constraint
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    border: isDragging || isEditing ? '1px dashed rgba(255,255,255,0.3)' : 'none',
    padding: '10px',
    zIndex: 20
  } : {
    // Non-overlay positioning (static)
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20
  };

  // Helper for text styles (Handling gradients)
  const getTextStyle = (
    size: number,
    color: string,
    lineHeight: number,
    weight: string,
    gradient?: string | null,
    bgColor?: string | null
  ): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontSize: `calc(${size} * 0.1538cqw)`, // Scale proportionally with container (ref: 650px)
      lineHeight: lineHeight,
      fontWeight: weight as any,
      textShadow: (gradient || bgColor) ? 'none' : '0 4px 30px rgba(0,0,0,0.8)', // Disable shadow on gradient/bg text
      whiteSpace: 'pre-wrap',
    };

    if (gradient) {
      return {
        ...baseStyle,
        backgroundImage: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent' // Fallback
      };
    }

    if (bgColor) {
      return {
        ...baseStyle,
        color: color,
        backgroundColor: bgColor,
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        padding: '4px 8px',
        borderRadius: '4px',
      }
    }

    return {
      ...baseStyle,
      color: color
    };
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-neutral-950 overflow-hidden shadow-2xl select-none"
      style={{ aspectRatio: `${w}/${h}`, containerType: 'inline-size' }}
      id={id || `slide-export-${index}`}
      onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}
    >
      {/* ── Background ─────────────────────────────────────────────────── */}
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

      {/* ── OVERLAY mode: gradient + text ──────────────────────────────── */}
      {textMode === 'overlay' && (
        <>
          {/* Gradient scrim (Affected by user opacity) */}
          <div className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
            style={{
              background: overlayGradients[layout] || overlayGradients['bottom-heavy'],
              opacity: slide.overlayOpacity
            }}
          />

          {/* Text wrapper (Draggable) */}
          <div
            className="flex flex-col gap-4"
            style={{
              ...draggableContainerStyle,
              textAlign: slide.textAlign
            }}
            onMouseDown={onMouseDown}
          >
            {/* Slide Indicator */}
            <div className="flex items-center gap-2 mb-2 opacity-50" style={{ justifyContent: slide.textAlign === 'center' ? 'center' : slide.textAlign === 'right' ? 'flex-end' : 'flex-start' }}>
              <span className="block h-px w-5" style={{ background: accentColor || 'white' }} />
              <span className="text-[9px] font-mono tracking-[0.3em] text-white uppercase shadow-black drop-shadow-md">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Headline */}
            <h2
              className={`${slide.headlineFont || 'font-brand'}`}
              style={getTextStyle(
                slide.headlineSize,
                slide.headlineColor,
                slide.headlineLineHeight,
                slide.headlineFontWeight,
                slide.headlineGradient,
                slide.headlineBgColor
              )}
            >
              {renderHeadline(slide.headline, slide.highlightColor, slide.highlightFont, slide.highlightFontWeight)}
            </h2>

            {/* Subheadline */}
            {slide.subHeadline && (
              <p
                className={`${slide.subHeadlineFont || 'font-modern'}`}
                style={getTextStyle(
                  slide.subHeadlineSize,
                  slide.subHeadlineColor,
                  slide.subHeadlineLineHeight || 1.4,
                  slide.subHeadlineFontWeight || '400',
                  null, // No gradient for sub
                  null  // No bg for sub usually
                )}
              >
                {slide.subHeadline}
              </p>
            )}

            {/* CTA Button - Custom Styling */}
            {slide.cta && (
              <div style={{ marginTop: '10px' }}>
                <span
                  className={`inline-block px-8 py-3 transition-all ${slide.ctaFont || 'font-brand'}`}
                  style={{
                    background: slide.ctaBgGradient || slide.ctaBgColor,
                    color: slide.ctaColor,
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    borderRadius: `${slide.ctaRoundness}px`,
                    boxShadow: slide.ctaShadow ? '0 10px 30px -5px rgba(0,0,0,0.5)' : 'none',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {slide.cta}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Brand Handle (Watermark) ──────────────────────────────── */}
      {brandHandle && textMode === 'overlay' && (
        <div className="absolute bottom-6 left-0 w-full text-center z-20 pointer-events-none opacity-50">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wider text-white bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/5">
            <AtSign className="w-3 h-3" /> {brandHandle.replace(/^@/, '')}
          </span>
        </div>
      )}

      {/* ── SAFE ZONES ─────────────────────────────────────────────────── */}
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
