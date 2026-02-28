
import React, { useState, useRef, useEffect } from 'react';
import { AdProject, GenerationStatus, Slide, ContentIntent, VisualStyle, AspectRatio, GenerationMode, BrandContext } from './types';
import { generateAdCopy, generateSlideImage, enhancePrompt, regenerateSlideCopy, editImage, generateVideo } from './services/geminiService';
import { getHistory, saveToHistory, deleteFromHistory } from './services/historyService';
import SlideCard from './components/SlideCard';
import { COLOR_THEMES, STYLE_CONFIGS, FONT_OPTIONS } from './constants';
import { toPng } from 'html-to-image';
import { 
  Sparkles, Download, Loader2, 
  Target, Zap, Palette,
  ChevronLeft, ChevronRight, Edit3, Settings,
  Layers, Image as ImageIcon, MousePointer2,
  Crown, Upload, RefreshCw, Wand2, Eye, LayoutTemplate,
  AlertCircle, Link, MonitorSmartphone, Square, Smartphone,
  FileText, Check, Type as TypeIcon, Move, Maximize2, Minimize2,
  Bold, AlignLeft, AlignCenter, AlignRight, Sliders, BoxSelect,
  PaintBucket, Copy, Grid, Lock, Key, XCircle, AtSign, Highlighter,
  Minus, Plus, History, Trash2, Calendar, Video, Play
} from 'lucide-react';

const QUICK_COLORS = ['#ffffff', '#000000', '#facc15', '#f87171', '#60a5fa', '#a78bfa', '#4ade80'];

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [genMode, setGenMode] = useState<GenerationMode>('carousel');
  const [intent, setIntent] = useState<ContentIntent>('paid-ads');
  const [style, setStyle] = useState<VisualStyle>('authority');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
  
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [project, setProject] = useState<AdProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // New features state
  const [refImage, setRefImage] = useState<string | null>(null);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [regeneratingCopy, setRegeneratingCopy] = useState(false);
  const [userAccentColor, setUserAccentColor] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // New AI features state
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState('');
  
  // Editor Tabs
  const [editorTab, setEditorTab] = useState<'text' | 'image' | 'design' | 'video'>('text');
  
  // Sidebar Mode (Create vs History)
  const [sidebarMode, setSidebarMode] = useState<'create' | 'history'>('create');
  const [history, setHistory] = useState<AdProject[]>([]);

  // Hover preview state
  const [hoveredStyle, setHoveredStyle] = useState<VisualStyle | null>(null);

  // Knowledge Base & Prompt Enhancer State
  const [knowledgeBase, setKnowledgeBase] = useState<string | null>(null);
  const [kbFileName, setKbFileName] = useState<string | null>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  
  // Text Mode (Overlay vs Baked)
  const [textMode, setTextMode] = useState<'overlay' | 'baked'>('overlay');

  const [brandContext, setBrandContext] = useState<BrandContext>({
    name: '',
    niche: '',
    targetAudience: '',
    tone: 'Profesional y Persuasivo'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Check API Key on mount & Load History
  useEffect(() => {
    const checkKey = async () => {
      const win = window as any;
      if (win.aistudio && win.aistudio.hasSelectedApiKey) {
        const has = await win.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        // Fallback for dev environments without the wrapper, assume injected
        setHasKey(true);
      }
    };
    checkKey();
    
    setHistory(getHistory());
  }, []);

  const handleConnectKey = async () => {
      const win = window as any;
      if (win.aistudio && win.aistudio.openSelectKey) {
          await win.aistudio.openSelectKey();
          setHasKey(true);
      }
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setRefImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleKnowledgeBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setKnowledgeBase(event.target.result as string);
          setKbFileName(file.name);
        }
      };
      reader.readAsText(file); 
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancingPrompt(true);
    try {
      const improved = await enhancePrompt(prompt);
      setPrompt(improved);
    } catch (err) {
      handleAIError(err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && project) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSlide(activeSlideIdx, { backgroundImageUrl: reader.result as string, imageError: undefined });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIError = (err: any) => {
    console.error(err);
    if (err.message?.includes("Requested entity was not found") || err.message?.includes("leaked") || err.message?.includes("PERMISSION_DENIED")) {
        setHasKey(false);
        setError("Tu llave de API ha sido reportada como filtrada o no es válida. Por favor, selecciona una nueva llave de API.");
        const win = window as any;
        if (win.aistudio && win.aistudio.openSelectKey) {
            win.aistudio.openSelectKey();
        }
    } else if (err.message === "ALL_AI_FAILED") {
        setError("Todos los modelos de IA fallaron al generar el contenido. Esto puede ser por saturación o un prompt inválido.");
    } else {
        setError(err.message || 'Error al procesar con IA. Verifica tu conexión o cuota.');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus('generating-copy');
    setError(null);
    setActiveSlideIdx(0);
    
    try {
      const copyResult = await generateAdCopy(
        prompt, genMode, intent, style, brandContext,
        refImage || undefined, knowledgeBase || undefined, textMode
      );
      
      const newProject: AdProject = {
        id: Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
        title: copyResult.title || 'Nueva Campaña',
        goal: prompt,
        intent,
        mode: genMode,
        visualStyle: style,
        aspectRatio, 
        textMode: textMode,
        brandContext, // Include brand context in the project
        primaryColor: '#000000',
        accentColor: COLOR_THEMES[0].accent,
        accentGradient: COLOR_THEMES[0].gradient, 
        slides: (copyResult.slides || []).map((s: any, idx: number) => {
          let defaultY = 50;
          if (s.layout === 'bottom-heavy') defaultY = 75;
          if (s.layout === 'top-heavy') defaultY = 25;

          return {
            ...s,
            id: `slide-${idx}`,
            overlayOpacity: STYLE_CONFIGS[style].defaultOverlay,
            
            headlineSize: genMode === 'single-image' ? 56 : 42, // Larger headline for single image
            headlineColor: '#ffffff',
            headlineLineHeight: 1.1,
            headlineFontWeight: '800',
            headlineGradient: null,
            headlineBgColor: null, 
            
            highlightColor: COLOR_THEMES[0].accent,
            highlightFont: 'font-serif',
            highlightFontWeight: '400',
            
            subHeadlineSize: genMode === 'single-image' ? 18 : 14,
            subHeadlineColor: '#cccccc',
            subHeadlineLineHeight: 1.4,
            subHeadlineFontWeight: '400',

            ctaColor: '#000000',
            ctaBgColor: '#ffffff',
            ctaBgGradient: null,
            ctaRoundness: 4,
            ctaShadow: true,

            imageBrightness: 100,
            imageContrast: 100,
            imageSaturation: 100,
            imageBlur: 0,

            textAlign: s.textAlign || 'center',
            textPosition: { x: 50, y: defaultY },
            layout: s.layout || 'centered',
            backgroundImageUrl: undefined
          };
        })
      };

      setProject(newProject);
      setStatus('generating-visuals');

      const updatedSlides = [...newProject.slides];
      const useReferenceStyle = !!refImage;

      for (let i = 0; i < updatedSlides.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 200));
        
        let imageUrl: string | null = null;
        let imageError: string | undefined = undefined;

        try {
          imageUrl = await generateSlideImage(
             updatedSlides[i].visualPrompt, style, useReferenceStyle, aspectRatio,
             updatedSlides[i].headline, textMode, updatedSlides[i].subHeadline, userAccentColor,
             genMode === 'angles-batch'
          );
        } catch (imgErr: any) {
          imageError = "Error de IA";
        }
        
        // Update local array for history (clean version)
        updatedSlides[i] = { ...updatedSlides[i], backgroundImageUrl: imageUrl, imageError };
        
        // Update React State preserving user edits
        setProject(prev => {
            if (!prev) return null;
            const newSlides = [...prev.slides];
            // Only update the image fields, keep everything else (text, positions) from current state
            newSlides[i] = { 
                ...newSlides[i], 
                backgroundImageUrl: imageUrl, 
                imageError 
            };
            return { ...prev, slides: newSlides };
        });
      }
      
      // Final Save to History
      const finalProject = { ...newProject, slides: [...updatedSlides] };
      // Do NOT overwrite project state here to avoid reverting user edits
      const updatedHistory = saveToHistory(finalProject);
      setHistory(updatedHistory);
      
      setStatus('done');
    } catch (err: any) {
      handleAIError(err);
      setStatus('error');
    }
  };

  const handleRegenerateSlideImage = async () => {
    if (!project) return;
    setRegeneratingImage(true);
    const slideIdx = activeSlideIdx;
    const currentSlide = project.slides[slideIdx];
    try {
      const newUrl = await generateSlideImage(
        currentSlide.visualPrompt, project.visualStyle, !!refImage, project.aspectRatio,
        currentSlide.headline, project.textMode, currentSlide.subHeadline, userAccentColor,
        project.mode === 'angles-batch'
      );
      updateSlide(slideIdx, { backgroundImageUrl: newUrl, imageError: undefined });
    } catch (err) {
      handleAIError(err);
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleRegenerateSlideCopy = async () => {
    if (!project) return;
    setRegeneratingCopy(true);
    try {
      const currentSlide = project.slides[activeSlideIdx];
      const newCopy = await regenerateSlideCopy(
        activeSlideIdx, project.slides.length, project.goal, project.visualStyle, project.intent, currentSlide.headline
      );
      updateSlide(activeSlideIdx, {
        headline: newCopy.headline,
        subHeadline: newCopy.subHeadline,
        ...(newCopy.cta ? { cta: newCopy.cta } : {})
      });
    } catch (err) {
      handleAIError(err);
    } finally {
      setRegeneratingCopy(false);
    }
  };

  const handleEditImage = async () => {
    if (!project || !editPrompt.trim()) return;
    const currentSlide = project.slides[activeSlideIdx];
    if (!currentSlide.backgroundImageUrl) return;

    setIsEditingImage(true);
    try {
      const editedUrl = await editImage(currentSlide.backgroundImageUrl, editPrompt);
      updateSlide(activeSlideIdx, { backgroundImageUrl: editedUrl });
      setEditPrompt('');
    } catch (err) {
      handleAIError(err);
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!project || !videoPrompt.trim()) return;
    const currentSlide = project.slides[activeSlideIdx];
    
    setIsVideoGenerating(true);
    setVideoProgress("Preparando generación...");
    try {
      const videoUrl = await generateVideo(
        videoPrompt, 
        currentSlide.backgroundImageUrl || undefined,
        project.aspectRatio === '9:16' ? '9:16' : '16:9',
        (status) => setVideoProgress(status)
      );
      updateSlide(activeSlideIdx, { videoUrl });
      setVideoPrompt('');
    } catch (err) {
      handleAIError(err);
    } finally {
      setIsVideoGenerating(false);
      setVideoProgress("");
    }
  };

  const updateSlide = (index: number, updates: Partial<Slide>) => {
    setProject(prev => {
      if (!prev) return null;
      const newSlides = [...prev.slides];
      newSlides[index] = { ...newSlides[index], ...updates };
      const updatedProject = { ...prev, slides: newSlides };
      
      // Auto-save changes to history (debounce could be added in prod)
      const newHistory = saveToHistory(updatedProject);
      setHistory(newHistory);
      
      return updatedProject;
    });
  };

  const loadProject = (p: AdProject) => {
    setProject(p);
    setAspectRatio(p.aspectRatio);
    setPrompt(p.goal);
    setStyle(p.visualStyle);
    setActiveSlideIdx(0);
    setStatus('done'); // Assume done if loading from history
    if (window.innerWidth < 768) {
       // Close sidebar on mobile if we had that logic, for now just load
    }
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = deleteFromHistory(id);
    setHistory(newHistory);
    if (project?.id === id) {
        setProject(null);
    }
  };

  const handleDownloadCurrent = async () => {
    if (!project) return;
    setIsExporting(true);
    const node = document.getElementById('active-slide-export');
    if (node) {
      try {
        const safeZones = node.querySelector('.safe-zone-overlay');
        const originalDisplay = safeZones ? (safeZones as HTMLElement).style.display : 'none';
        if (safeZones) (safeZones as HTMLElement).style.display = 'none';

        const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 3, quality: 1 });
        if (safeZones) (safeZones as HTMLElement).style.display = originalDisplay;

        const link = document.createElement('a');
        link.download = `${project.title.replace(/\s+/g, '-').toLowerCase()}-${project.mode === 'angles-batch' ? project.slides[activeSlideIdx].angleLabel : 'slide'}-${activeSlideIdx + 1}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        alert("Error al descargar. Inténtalo de nuevo.");
      }
    }
    setIsExporting(false);
  };

  const [gradientStart, setGradientStart] = useState('#ffffff');
  const [gradientEnd, setGradientEnd] = useState('#999999');
  const [ctaGradStart, setCtaGradStart] = useState('#ff9966');
  const [ctaGradEnd, setCtaGradEnd] = useState('#ff5e62');

  const applyGradient = () => {
    const gradient = `linear-gradient(to right, ${gradientStart}, ${gradientEnd})`;
    updateSlide(activeSlideIdx, { headlineGradient: gradient, headlineBgColor: null });
  };
  
  const applyCtaGradient = () => {
    const gradient = `linear-gradient(to right, ${ctaGradStart}, ${ctaGradEnd})`;
    updateSlide(activeSlideIdx, { ctaBgGradient: gradient });
  };

  const removeGradient = () => {
    updateSlide(activeSlideIdx, { headlineGradient: null });
  };

  const toggleHeadlineBg = () => {
      const current = project?.slides[activeSlideIdx].headlineBgColor;
      if (current) {
          updateSlide(activeSlideIdx, { headlineBgColor: null });
      } else {
          updateSlide(activeSlideIdx, { headlineBgColor: '#000000', headlineGradient: null });
      }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="flex justify-center">
             <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                <Crown className="w-10 h-10 text-black fill-black" />
             </div>
           </div>
           
           <div className="space-y-4">
              <h1 className="text-3xl font-black uppercase tracking-tight">Acceso Pro Requerido</h1>
              <p className="text-neutral-400 leading-relaxed">
                 Para usar los modelos avanzados de generación de imágenes con texto perfecto (Gemini 3 Pro), necesitas conectar tu API Key de Google AI Studio.
              </p>
           </div>
           <button 
             onClick={handleConnectKey}
             className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
           >
              <Key className="w-4 h-4" /> Conectar Google AI
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-white selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className="w-full md:w-[450px] border-r border-white/5 p-8 flex flex-col gap-8 bg-neutral-900/40 backdrop-blur-3xl h-screen sticky top-0 overflow-y-auto no-scrollbar z-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-600/20">
                <Crown className="w-8 h-8 text-black fill-black" />
            </div>
            <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-white">AdGenius <span className="text-yellow-500">PRO V3</span></h1>
                <p className="text-xs text-neutral-400 font-bold tracking-widest mt-1">AI CREATIVE DIRECTOR</p>
            </div>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
            <button 
                onClick={() => setSidebarMode('create')} 
                className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${sidebarMode === 'create' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
                <Sparkles className="w-4 h-4" /> CREAR
            </button>
            <button 
                onClick={() => setSidebarMode('history')} 
                className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${sidebarMode === 'history' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
            >
                <History className="w-4 h-4" /> HISTORIAL
            </button>
        </div>

        {sidebarMode === 'create' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            
            {/* Brand Context Section */}
            <div className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-5">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                        <Target className="w-4 h-4 text-yellow-500" />
                    </div>
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-200">Contexto de Marca</label>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Nombre de la Marca</label>
                        <input 
                            type="text"
                            value={brandContext.name}
                            onChange={(e) => setBrandContext({...brandContext, name: e.target.value})}
                            placeholder="Ej: Mi Agencia, Nike, Apple..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-yellow-500/50 outline-none transition-all placeholder:text-neutral-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Nicho / Industria</label>
                        <input 
                            type="text"
                            value={brandContext.niche}
                            onChange={(e) => setBrandContext({...brandContext, niche: e.target.value})}
                            placeholder="Ej: Fitness, Real Estate, SaaS..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-yellow-500/50 outline-none transition-all placeholder:text-neutral-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Público Objetivo</label>
                        <input 
                            type="text"
                            value={brandContext.targetAudience}
                            onChange={(e) => setBrandContext({...brandContext, targetAudience: e.target.value})}
                            placeholder="Ej: Emprendedores de 25-40 años..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-yellow-500/50 outline-none transition-all placeholder:text-neutral-700"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Tono de Voz</label>
                        <select 
                            value={brandContext.tone}
                            onChange={(e) => setBrandContext({...brandContext, tone: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 ring-yellow-500/50 outline-none transition-all text-neutral-300"
                        >
                            <option value="Profesional y Persuasivo">Profesional y Persuasivo</option>
                            <option value="Disruptivo y Agresivo">Disruptivo y Agresivo</option>
                            <option value="Cercano y Amigable">Cercano y Amigable</option>
                            <option value="Lujoso y Exclusivo">Lujoso y Exclusivo</option>
                            <option value="Divertido e Irreverente">Divertido e Irreverente</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Idea del Contenido</label>
                    <button 
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancingPrompt || !prompt}
                    className="text-xs flex items-center gap-2 text-yellow-500 hover:text-yellow-400 transition-colors font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-yellow-500/10"
                    >
                    {isEnhancingPrompt ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                    {isEnhancingPrompt ? "Mejorando..." : "Mejorar"}
                    </button>
                </div>
                <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ej: High ticket coaching, mentalidad de éxito..."
                className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-5 text-base focus:ring-2 ring-yellow-500/50 outline-none transition-all resize-none placeholder:text-neutral-600 font-medium leading-relaxed"
                />
            </div>

            <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Base de Conocimiento</label>
                <div 
                onClick={() => docInputRef.current?.click()}
                className={`w-full py-4 px-5 border border-dashed rounded-xl flex items-center gap-4 cursor-pointer transition-all group ${knowledgeBase ? 'bg-blue-500/10 border-blue-500/50' : 'bg-neutral-800/30 border-white/10 hover:bg-neutral-800/50'}`}
                >
                <div className={`p-3 rounded-lg ${knowledgeBase ? 'bg-blue-500/20' : 'bg-neutral-800'}`}>
                    {knowledgeBase ? <Check className="w-5 h-5 text-blue-400" /> : <FileText className="w-5 h-5 text-neutral-400" />}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-bold truncate ${knowledgeBase ? 'text-blue-200' : 'text-neutral-300 group-hover:text-white'}`}>
                    {kbFileName || "Subir Documento (PDF/TXT)"}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">La IA usará esto como contexto.</p>
                </div>
                <input 
                    type="file" 
                    ref={docInputRef} 
                    className="hidden" 
                    accept=".txt,.md,.json,.csv,.pdf,.doc,.docx"
                    onChange={handleKnowledgeBaseUpload}
                />
                </div>
            </div>

            {/* Controls Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Format */}
                <div className="space-y-3 col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Formato</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(['1:1', '3:4', '9:16'] as AspectRatio[]).map(r => (
                            <button key={r} onClick={() => setAspectRatio(r)} className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all ${aspectRatio === r ? 'bg-white text-black border-white shadow-lg' : 'border-white/10 text-neutral-500 hover:bg-white/5 hover:text-white'}`}>{r}</button>
                        ))}
                    </div>
                </div>

                {/* Generation Mode */}
                <div className="space-y-3 col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400 flex justify-between items-center">
                        Tipo de Contenido
                    </label>
                    <div className="grid grid-cols-3 gap-2 bg-neutral-900/50 p-1.5 rounded-2xl border border-white/5">
                        <button onClick={() => setGenMode('single-image')} className={`py-3 rounded-xl text-[10px] font-black transition-all flex flex-col items-center gap-1.5 ${genMode === 'single-image' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
                            <ImageIcon className="w-4 h-4"/>
                            SINGLE
                        </button>
                        <button onClick={() => setGenMode('carousel')} className={`py-3 rounded-xl text-[10px] font-black transition-all flex flex-col items-center gap-1.5 ${genMode === 'carousel' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
                            <Copy className="w-4 h-4"/>
                            CARRUSEL
                        </button>
                        <button onClick={() => setGenMode('angles-batch')} className={`py-3 rounded-xl text-[10px] font-black transition-all flex flex-col items-center gap-1.5 ${genMode === 'angles-batch' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' : 'text-neutral-500 hover:text-neutral-300'}`}>
                            <Grid className="w-4 h-4"/>
                            VOLUMEN
                        </button>
                    </div>
                </div>
            </div>

            {/* Visual Style Selector */}
            <div className={`space-y-3 transition-all duration-300 relative ${refImage ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                <label className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center justify-between">
                Estilo Visual
                </label>
                <div className="grid grid-cols-2 gap-3 relative">
                {/* Hover Preview Card */}
                {hoveredStyle && STYLE_CONFIGS[hoveredStyle] && (
                    <div className="absolute bottom-full left-0 mb-4 w-72 p-3 bg-neutral-950/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[100] animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none transform origin-bottom">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-3 border border-white/10">
                        <img src={STYLE_CONFIGS[hoveredStyle].preview} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-xs font-black uppercase tracking-widest text-white block mb-0.5">{STYLE_CONFIGS[hoveredStyle].name}</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-neutral-300 leading-relaxed px-1 font-medium italic">
                        "{STYLE_CONFIGS[hoveredStyle].desc}"
                    </p>
                    </div>
                )}
                
                {(Object.keys(STYLE_CONFIGS) as VisualStyle[]).map(s => (
                    <button 
                    key={s} 
                    onClick={() => setStyle(s)}
                    onMouseEnter={() => setHoveredStyle(s)}
                    onMouseLeave={() => setHoveredStyle(null)}
                    className={`py-3 px-2 rounded-xl border text-[10px] font-black transition-all uppercase tracking-tighter ${style === s ? 'bg-white text-black border-white shadow-lg scale-[1.02]' : 'border-white/5 text-neutral-500 hover:bg-white/5 hover:text-white'}`}
                    >
                    {STYLE_CONFIGS[s].name}
                    </button>
                ))}
                </div>
            </div>
            
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-red-200 uppercase">Error de Generación</p>
                    <p className="text-xs text-red-300 mt-1 leading-relaxed">{error}</p>
                </div>
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
                className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:opacity-50 rounded-2xl font-black text-black text-base tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-amber-600/20 group uppercase transform hover:scale-[1.01] active:scale-[0.99]"
            >
                {status === 'idle' || status === 'done' || status === 'error' ? 'GENERAR CAMPAÑA' : <><Loader2 className="w-6 h-6 animate-spin" /> PROCESANDO...</>}
            </button>
            </div>
        ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full overflow-y-auto">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center p-8 border border-dashed border-white/10 rounded-2xl">
                        <History className="w-8 h-8 text-neutral-600 mb-4" />
                        <p className="text-sm font-bold text-neutral-500">Sin historial aún</p>
                        <p className="text-xs text-neutral-600 mt-1">Genera tu primera campaña para verla aquí.</p>
                    </div>
                ) : (
                    history.map((h) => (
                        <div 
                            key={h.id} 
                            onClick={() => loadProject(h)}
                            className={`group relative p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${project?.id === h.id ? 'bg-white/10 border-white/30 shadow-lg' : 'bg-neutral-900/50 border-white/5 hover:bg-neutral-800'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${h.mode === 'angles-batch' ? 'bg-purple-900/40 text-purple-300' : 'bg-neutral-700 text-neutral-300'}`}>
                                    {h.mode === 'angles-batch' ? 'Volumen' : 'Carrusel'}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono">
                                    {new Date(h.createdAt || Date.now()).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">{h.title}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-500 mb-3">
                                <span className="capitalize">{h.visualStyle}</span>
                                <span>•</span>
                                <span>{h.aspectRatio}</span>
                            </div>
                            
                            <button 
                                onClick={(e) => deleteProject(h.id, e)}
                                className="absolute top-4 right-4 p-2 text-neutral-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
                
                {history.length > 0 && (
                    <div className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10 mt-4">
                        <div className="flex gap-2 items-start">
                             <AlertCircle className="w-4 h-4 text-yellow-500/50 mt-0.5 shrink-0" />
                             <p className="text-[10px] text-yellow-500/50 leading-relaxed">
                                Solo se guardan los últimos 5 proyectos localmente para optimizar el rendimiento.
                             </p>
                        </div>
                    </div>
                )}
            </div>
        )}
      </aside>

      {/* Area de Visualización */}
      <main className="flex-1 overflow-y-auto bg-black flex flex-col items-center p-8 md:p-12 gap-10 relative">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-neutral-900/50 to-black pointer-events-none" />

        {!project ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl text-center space-y-12 animate-in fade-in zoom-in duration-700 z-10 w-full">
             
             {/* Collage Hero */}
             <div className="relative w-full max-w-2xl h-[400px] perspective-1000">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
                
                {/* Image Grid */}
                <div className="grid grid-cols-3 gap-4 transform rotate-x-12 scale-90 hover:scale-100 transition-transform duration-700 ease-out">
                    {[
                        "https://picsum.photos/seed/ad1/300/400",
                        "https://picsum.photos/seed/ad2/300/400",
                        "https://picsum.photos/seed/ad3/300/400",
                        "https://picsum.photos/seed/ad4/300/400",
                        "https://picsum.photos/seed/ad5/300/400",
                        "https://picsum.photos/seed/ad6/300/400"
                    ].map((src, i) => (
                        <div key={i} className={`relative rounded-xl overflow-hidden shadow-2xl border border-white/10 group ${i % 2 === 0 ? 'translate-y-8' : '-translate-y-8'}`}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                            <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                            <div className="absolute bottom-3 left-3 z-20">
                                <div className="h-1 w-8 bg-white/50 rounded-full mb-2" />
                                <div className="h-1 w-16 bg-white/30 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             <div className="space-y-6 max-w-xl mx-auto relative z-20">
                <h2 className="text-6xl font-black uppercase tracking-tighter text-white leading-[0.9]">
                  Generador de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 font-serif italic font-normal">Impacto</span>
                </h2>
                <p className="text-neutral-400 text-xl leading-relaxed font-medium">
                   Crea campañas publicitarias completas en segundos. <br/>
                   <span className="text-white font-bold">Copywriting persuasivo + Diseño visual de alto nivel.</span>
                </p>
             </div>
          </div>
        ) : (
          <div className="w-full max-w-7xl space-y-12 pb-32 z-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
               <div className="space-y-2">
                  <div className="flex items-center gap-3">
                     <span className={`px-3 py-1 rounded-md text-xs font-black uppercase bg-white text-black`}>{project.intent}</span>
                     {project.mode === 'angles-batch' 
                        ? <span className="text-xs text-purple-400 font-bold uppercase tracking-widest bg-purple-900/20 px-3 py-1 rounded-md border border-purple-500/30">MODO VOLUMEN</span>
                        : <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest bg-neutral-900 px-3 py-1 rounded-md border border-white/10">{refImage ? 'CLONED' : `${project.visualStyle}`}</span>
                     }
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter max-w-3xl leading-none mt-2">{project.title}</h2>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setShowSafeZones(!showSafeZones)} className={`p-4 rounded-xl transition-all border ${showSafeZones ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-neutral-900 border-white/10 text-neutral-500 hover:text-white'}`} title="Mostrar Zonas Seguras"><LayoutTemplate className="w-6 h-6" /></button>
                  <button onClick={handleDownloadCurrent} disabled={isExporting} className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50">
                    {isExporting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-5 h-5" />} DESCARGAR
                  </button>
               </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-16">
               {/* Canvas View */}
               <div className="xl:col-span-7 flex flex-col items-center gap-8">
                  <div className="relative w-full flex items-center justify-center group">
                    <button onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))} className="absolute -left-16 z-30 p-5 bg-neutral-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 text-white shadow-xl" disabled={activeSlideIdx === 0}><ChevronLeft className="w-8 h-8" /></button>
                    
                    <div className="w-full max-w-[650px] animate-in slide-in-from-right-8 duration-500 relative ring-1 ring-white/10 shadow-2xl">
                      <div className="relative flex justify-center">
                        <SlideCard 
                          id="active-slide-export"
                          slide={project.slides[activeSlideIdx]} 
                          visualStyle={project.visualStyle} 
                          accentGradient={userAccentColor ? `linear-gradient(135deg, ${userAccentColor}, ${userAccentColor}cc)` : project.accentGradient}
                          accentColor={userAccentColor || project.accentColor}
                          brandHandle={project.brandHandle}
                          index={activeSlideIdx}
                          isEditing={true}
                          onPositionChange={(x, y) => updateSlide(activeSlideIdx, { textPosition: { x, y } })}
                          aspectRatio={project.aspectRatio}
                          showSafeZones={showSafeZones}
                          textMode={project.textMode}
                          hideNumbering={genMode === 'angles-batch'}
                        />
                      </div>
                    </div>

                    <button onClick={() => setActiveSlideIdx(Math.min(project.slides.length - 1, activeSlideIdx + 1))} className="absolute -right-16 z-30 p-5 bg-neutral-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 text-white shadow-xl" disabled={activeSlideIdx === project.slides.length - 1}><ChevronRight className="w-8 h-8" /></button>
                  </div>
                  <div className="flex gap-4">
                    {project.slides.map((_, i) => (
                      <button key={i} onClick={() => setActiveSlideIdx(i)} className={`h-2 transition-all rounded-full ${i === activeSlideIdx ? 'w-16 bg-white shadow-[0_0_15px_white]' : 'w-4 bg-neutral-800 hover:bg-neutral-600'}`} />
                    ))}
                  </div>
               </div>

               {/* Advanced Editor Panel */}
               <div className="xl:col-span-5 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                  <div className="p-6 bg-neutral-900/80 border border-white/10 rounded-[32px] space-y-6 backdrop-blur-md shadow-2xl">
                    
                        {/* Top Actions */}
                        <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleRegenerateSlideCopy} disabled={regeneratingCopy} className="bg-purple-900/30 hover:bg-purple-900/50 p-4 rounded-2xl text-xs font-bold text-purple-200 flex items-center justify-center gap-3 border border-purple-500/20 transition-all hover:scale-[1.02]">
                            {regeneratingCopy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} REESCRIBIR COPY
                        </button>
                        <button onClick={handleRegenerateSlideImage} disabled={regeneratingImage} className="bg-blue-900/30 hover:bg-blue-900/50 p-4 rounded-2xl text-xs font-bold text-blue-200 flex items-center justify-center gap-3 border border-blue-500/20 transition-all hover:scale-[1.02]">
                            {regeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} NUEVA IMAGEN
                        </button>
                        </div>

                        {/* Editor Tabs */}
                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                            <button onClick={() => setEditorTab('text')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${editorTab === 'text' ? 'bg-neutral-800 text-white shadow-lg scale-100' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                                <TypeIcon className="w-4 h-4"/> TEXTO
                            </button>
                            <button onClick={() => setEditorTab('image')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${editorTab === 'image' ? 'bg-neutral-800 text-white shadow-lg scale-100' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                                <ImageIcon className="w-4 h-4"/> IMAGEN
                            </button>
                            <button onClick={() => setEditorTab('design')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${editorTab === 'design' ? 'bg-neutral-800 text-white shadow-lg scale-100' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                                <BoxSelect className="w-4 h-4"/> MARCA
                            </button>
                            <button onClick={() => setEditorTab('video')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${editorTab === 'video' ? 'bg-neutral-800 text-white shadow-lg scale-100' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                                <Video className="w-4 h-4"/> VIDEO
                            </button>
                        </div>

                        {/* TEXT EDITOR TAB */}
                        {editorTab === 'text' && (
                            project.textMode === 'overlay' ? (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                {/* HEADLINE */}
                                <div className="space-y-4 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                    <label className="text-xs font-black uppercase tracking-widest text-neutral-400 flex justify-between">
                                        Titular Principal
                                    </label>

                                    {/* COLOR PICKER REDESIGNED */}
                                    <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-4">
                                        {/* Quick Palette */}
                                        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                                          {QUICK_COLORS.map(c => (
                                            <button 
                                              key={c} 
                                              onClick={() => updateSlide(activeSlideIdx, { headlineColor: c, headlineGradient: null })}
                                              className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 transition-transform shadow-lg shrink-0"
                                              style={{ backgroundColor: c }}
                                            />
                                          ))}
                                        </div>

                                        <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                                            <button onClick={() => removeGradient()} className={`flex-1 py-2 rounded-lg transition-all ${!project.slides[activeSlideIdx].headlineGradient ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}>Sólido</button>
                                            <button onClick={() => applyGradient()} className={`flex-1 py-2 rounded-lg transition-all ${project.slides[activeSlideIdx].headlineGradient ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}>Degradado</button>
                                        </div>

                                        {!project.slides[activeSlideIdx].headlineGradient ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="relative h-10 rounded-xl overflow-hidden border border-white/10 cursor-pointer group col-span-1 bg-neutral-800">
                                                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/50 group-hover:text-white transition-colors z-10 pointer-events-none uppercase tracking-widest">
                                                        Custom Color
                                                    </div>
                                                    <input 
                                                        type="color" 
                                                        value={project.slides[activeSlideIdx].headlineColor} 
                                                        onChange={(e) => updateSlide(activeSlideIdx, { headlineColor: e.target.value })} 
                                                        className="absolute -inset-4 w-[200%] h-[200%] cursor-pointer p-0 border-0 opacity-0"
                                                    />
                                                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: project.slides[activeSlideIdx].headlineColor }} />
                                                </div>
                                                <button 
                                                    onClick={toggleHeadlineBg} 
                                                    className={`col-span-1 h-10 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${project.slides[activeSlideIdx].headlineBgColor ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-neutral-500 hover:bg-white/5'}`}
                                                >
                                                    <Highlighter className="w-4 h-4" /> Resaltar
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <div className="relative h-10 rounded-xl overflow-hidden border border-white/10 bg-neutral-800">
                                                        <input type="color" value={gradientStart} onChange={(e) => { setGradientStart(e.target.value); applyGradient(); }} className="absolute -inset-4 w-[200%] h-[200%] cursor-pointer"/>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="relative h-10 rounded-xl overflow-hidden border border-white/10 bg-neutral-800">
                                                        <input type="color" value={gradientEnd} onChange={(e) => { setGradientEnd(e.target.value); applyGradient(); }} className="absolute -inset-4 w-[200%] h-[200%] cursor-pointer"/>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <textarea 
                                      value={project.slides[activeSlideIdx].headline} 
                                      onChange={(e) => updateSlide(activeSlideIdx, { headline: e.target.value })} 
                                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-base font-bold h-28 text-white focus:ring-1 ring-white/20 outline-none leading-snug" 
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 block">Tipografía</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select 
                                                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-white/30" 
                                                  value={project.slides[activeSlideIdx].headlineFont || ''} 
                                                  onChange={(e) => updateSlide(activeSlideIdx, { headlineFont: e.target.value })}
                                                >
                                                    <option value="">Defecto (IA)</option>
                                                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                                                </select>
                                                <select 
                                                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-white/30" 
                                                  value={project.slides[activeSlideIdx].headlineFontWeight || '800'} 
                                                  onChange={(e) => updateSlide(activeSlideIdx, { headlineFontWeight: e.target.value })}
                                                >
                                                    <option value="300">Light</option>
                                                    <option value="400">Regular</option>
                                                    <option value="500">Medium</option>
                                                    <option value="700">Bold</option>
                                                    <option value="800">Extra Bold</option>
                                                    <option value="900">Black</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 block">Tamaño ({project.slides[activeSlideIdx].headlineSize}px)</label>
                                            <input type="range" min="12" max="150" value={project.slides[activeSlideIdx].headlineSize} onChange={(e) => updateSlide(activeSlideIdx, { headlineSize: parseInt(e.target.value) })} className="w-full h-2 bg-neutral-700 rounded-lg accent-white cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 block">Altura Línea</label>
                                            <input type="range" min="0.8" max="2.0" step="0.1" value={project.slides[activeSlideIdx].headlineLineHeight} onChange={(e) => updateSlide(activeSlideIdx, { headlineLineHeight: parseFloat(e.target.value) })} className="w-full h-2 bg-neutral-700 rounded-lg accent-white cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                {/* KEYWORD HIGHLIGHT STYLE */}
                                <div className="space-y-4 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Palabra Clave (*)</label>
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 cursor-pointer hover:scale-110 transition-transform">
                                            <input type="color" value={project.slides[activeSlideIdx].highlightColor || '#facc15'} onChange={(e) => updateSlide(activeSlideIdx, { highlightColor: e.target.value })} className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30" 
                                            value={project.slides[activeSlideIdx].highlightFont || ''} 
                                            onChange={(e) => updateSlide(activeSlideIdx, { highlightFont: e.target.value })}
                                        >
                                            <option value="">Igual al Titular</option>
                                            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                                        </select>
                                        <select 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30" 
                                            value={project.slides[activeSlideIdx].highlightFontWeight || '400'} 
                                            onChange={(e) => updateSlide(activeSlideIdx, { highlightFontWeight: e.target.value })}
                                        >
                                            <option value="300">Light</option>
                                            <option value="400">Regular</option>
                                            <option value="500">Medium</option>
                                            <option value="700">Bold</option>
                                            <option value="800">Extra Bold</option>
                                            <option value="900">Black</option>
                                        </select>
                                    </div>
                                </div>

                                {/* SUBHEADLINE */}
                                <div className="space-y-4 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Texto Secundario</label>
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 cursor-pointer hover:scale-110 transition-transform">
                                            <input type="color" value={project.slides[activeSlideIdx].subHeadlineColor} onChange={(e) => updateSlide(activeSlideIdx, { subHeadlineColor: e.target.value })} className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer" />
                                        </div>
                                    </div>
                                    <textarea value={project.slides[activeSlideIdx].subHeadline} onChange={(e) => updateSlide(activeSlideIdx, { subHeadline: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm h-24 text-neutral-300 focus:ring-1 ring-white/20 outline-none" />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2"><span>Tamaño</span><span>{project.slides[activeSlideIdx].subHeadlineSize}px</span></div>
                                            <input type="range" min="8" max="60" value={project.slides[activeSlideIdx].subHeadlineSize} onChange={(e) => updateSlide(activeSlideIdx, { subHeadlineSize: parseInt(e.target.value) })} className="w-full h-2 bg-neutral-700 rounded-lg accent-white cursor-pointer" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2"><span>Peso</span></div>
                                            <select 
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-white/30 h-8" 
                                                value={project.slides[activeSlideIdx].subHeadlineFontWeight || '400'} 
                                                onChange={(e) => updateSlide(activeSlideIdx, { subHeadlineFontWeight: e.target.value })}
                                            >
                                                <option value="300">Light</option>
                                                <option value="400">Regular</option>
                                                <option value="500">Medium</option>
                                                <option value="700">Bold</option>
                                                <option value="900">Black</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Alignment */}
                                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                                    {(['left', 'center', 'right'] as const).map(a => (
                                    <button key={a} onClick={() => updateSlide(activeSlideIdx, { textAlign: a })} className={`flex-1 py-3 rounded-lg flex items-center justify-center transition-all ${project.slides[activeSlideIdx].textAlign === a ? 'bg-white/10 text-white shadow-sm' : 'text-neutral-600 hover:text-white'}`}>
                                        {a === 'left' ? <AlignLeft className="w-5 h-5"/> : a === 'center' ? <AlignCenter className="w-5 h-5"/> : <AlignRight className="w-5 h-5"/>}
                                    </button>
                                    ))}
                                </div>
                            </div>
                            ) : (
                            <div className="p-10 text-center border-2 border-dashed border-purple-500/30 rounded-3xl bg-purple-500/5 flex flex-col items-center gap-4">
                                <div className="p-4 bg-purple-500/10 rounded-full">
                                   <Sparkles className="w-8 h-8 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-purple-200 font-bold uppercase tracking-widest">Modo Artístico (Baked)</p>
                                    <p className="text-xs text-purple-400/70 mt-2 max-w-xs mx-auto leading-relaxed">El texto está "fusionado" artísticamente en la imagen por la IA. Para editarlo, cambia el texto arriba y pulsa "NUEVA IMAGEN".</p>
                                </div>
                            </div>
                            )
                        )}

                        {/* IMAGE EDITOR TAB */}
                        {editorTab === 'image' && (
                            <div className="space-y-6 animate-in fade-in duration-300 p-2">
                                {/* VISUAL PROMPT EDITOR */}
                                <div className="space-y-3 pb-6 border-b border-white/5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Prompt Visual (IA)</label>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(project.slides[activeSlideIdx].visualPrompt);
                                            }}
                                            className="text-[10px] text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                            <Copy className="w-3 h-3" /> Copiar
                                        </button>
                                    </div>
                                    <textarea 
                                        value={project.slides[activeSlideIdx].visualPrompt}
                                        onChange={(e) => updateSlide(activeSlideIdx, { visualPrompt: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-neutral-400 focus:text-white focus:border-blue-500/50 outline-none resize-none h-20 leading-relaxed"
                                        placeholder="Describe la imagen que quieres..."
                                    />
                                    <p className="text-[10px] text-neutral-600">
                                        Edita este texto y pulsa <strong className="text-neutral-400">"NUEVA IMAGEN"</strong> arriba para regenerar con estos cambios.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Imagen de Fondo</label>
                                    <button onClick={() => bgInputRef.current?.click()} className="text-xs font-bold text-white hover:underline flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><Upload className="w-4 h-4"/> Subir Propia</button>
                                    <input type="file" ref={bgInputRef} className="hidden" onChange={handleBgImageUpload} accept="image/*" />
                                </div>

                                {/* MAGIC EDIT SECTION */}
                                <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wand2 className="w-4 h-4 text-indigo-400" />
                                        <label className="text-xs font-black uppercase tracking-widest text-indigo-200">Edición Mágica (IA)</label>
                                    </div>
                                    <div className="relative">
                                        <textarea 
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            placeholder="Ej: 'Añade un filtro retro' o 'Quita el fondo'..."
                                            className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-indigo-500/50 outline-none resize-none h-20 leading-relaxed"
                                        />
                                        <button 
                                            onClick={handleEditImage}
                                            disabled={isEditingImage || !editPrompt.trim() || !project.slides[activeSlideIdx].backgroundImageUrl}
                                            className="absolute bottom-3 right-3 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 disabled:opacity-50 transition-all shadow-lg"
                                        >
                                            {isEditingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-indigo-300/60 leading-tight">
                                        Usa Gemini 2.5 Flash para editar la imagen actual con lenguaje natural.
                                    </p>
                                </div>

                                {/* Filters */}
                                <div className="space-y-6">
                                    {[
                                        { label: 'Brillo', key: 'imageBrightness', min: 0, max: 200, unit: '%' },
                                        { label: 'Contraste', key: 'imageContrast', min: 0, max: 200, unit: '%' },
                                        { label: 'Saturación', key: 'imageSaturation', min: 0, max: 200, unit: '%' },
                                        { label: 'Desenfoque', key: 'imageBlur', min: 0, max: 20, unit: 'px', step: 0.5 }
                                    ].map((control) => (
                                        <div key={control.key} className="space-y-2">
                                            <div className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-widest">
                                                <span>{control.label}</span>
                                                <span className="text-white">{(project.slides[activeSlideIdx] as any)[control.key]}{control.unit}</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min={control.min} 
                                                max={control.max} 
                                                step={control.step || 1}
                                                value={(project.slides[activeSlideIdx] as any)[control.key]} 
                                                onChange={(e) => updateSlide(activeSlideIdx, { [control.key]: parseFloat(e.target.value) })} 
                                                className="w-full h-2 bg-neutral-700 rounded-lg accent-white cursor-pointer" 
                                            />
                                        </div>
                                    ))}
                                </div>

                                {project.textMode === 'overlay' && (
                                    <div className="pt-6 border-t border-white/5 space-y-3">
                                        <div className="flex justify-between text-xs font-black text-neutral-400 uppercase tracking-widest">
                                        <span>Oscuridad Capa (Overlay)</span>
                                        <span className="text-white">{Math.round(project.slides[activeSlideIdx].overlayOpacity * 100)}%</span>
                                        </div>
                                        <input type="range" min="0" max="0.95" step="0.05" value={project.slides[activeSlideIdx].overlayOpacity} onChange={(e) => updateSlide(activeSlideIdx, { overlayOpacity: parseFloat(e.target.value) })} className="w-full h-2 bg-neutral-700 rounded-lg accent-yellow-500 cursor-pointer" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CTA / DESIGN TAB */}
                        {editorTab === 'design' && (
                            <div className="space-y-6 animate-in fade-in duration-300 p-2">
                                {/* BRANDING SECTION */}
                                <div className="space-y-3 pb-6 border-b border-white/5">
                                    <label className="text-xs font-black uppercase text-white flex items-center gap-2 tracking-widest">
                                        <AtSign className="w-4 h-4 text-yellow-500" /> Marca de Agua (Handle)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={project.brandHandle || ''} 
                                        onChange={(e) => setProject(prev => prev ? {...prev, brandHandle: e.target.value} : null)} 
                                        placeholder="@tu_marca" 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-medium text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30" 
                                    />
                                    <p className="text-[10px] text-neutral-500">Se aplicará a todos los slides automáticamente.</p>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <label className="text-xs font-black uppercase text-white tracking-widest">Texto del Botón (CTA)</label>
                                    <input type="text" value={project.slides[activeSlideIdx].cta || ''} onChange={(e) => updateSlide(activeSlideIdx, { cta: e.target.value })} placeholder="Ej: COMPRAR AHORA" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:outline-none focus:border-white/30" />
                                </div>
                                
                                {project.slides[activeSlideIdx].cta && (
                                    <div className="space-y-5 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="col-span-2">
                                                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-2 tracking-widest">Fondo (Sólido o Degradado)</label>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                                                        <button onClick={() => updateSlide(activeSlideIdx, { ctaBgGradient: null })} className={`flex-1 py-2 rounded-lg transition-all ${!project.slides[activeSlideIdx].ctaBgGradient ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}>Sólido</button>
                                                        <button onClick={() => applyCtaGradient()} className={`flex-1 py-2 rounded-lg transition-all ${project.slides[activeSlideIdx].ctaBgGradient ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}`}>Degradado</button>
                                                    </div>

                                                    {!project.slides[activeSlideIdx].ctaBgGradient ? (
                                                        <div className="relative h-10 rounded-xl overflow-hidden border border-white/10 cursor-pointer bg-neutral-800">
                                                            <input type="color" value={project.slides[activeSlideIdx].ctaBgColor || '#ffffff'} onChange={(e) => updateSlide(activeSlideIdx, { ctaBgColor: e.target.value })} className="absolute -inset-4 w-[200%] h-[200%] cursor-pointer p-0 border-0" />
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
                                                            <input type="color" className="w-full h-8 bg-transparent cursor-pointer" value={ctaGradStart} onChange={(e) => { setCtaGradStart(e.target.value); applyCtaGradient(); }} />
                                                            <input type="color" className="w-full h-8 bg-transparent cursor-pointer" value={ctaGradEnd} onChange={(e) => { setCtaGradEnd(e.target.value); applyCtaGradient(); }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-neutral-500 font-bold uppercase block mb-2 tracking-widest">Color Texto</label>
                                                <div className="relative h-10 rounded-xl overflow-hidden border border-white/10 cursor-pointer bg-neutral-800">
                                                    <input type="color" value={project.slides[activeSlideIdx].ctaColor || '#000000'} onChange={(e) => updateSlide(activeSlideIdx, { ctaColor: e.target.value })} className="absolute -inset-4 w-[200%] h-[200%] cursor-pointer p-0 border-0" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest mb-2 block">Tipografía</label>
                                            <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none" value={project.slides[activeSlideIdx].ctaFont || ''} onChange={(e) => updateSlide(activeSlideIdx, { ctaFont: e.target.value })}>
                                                <option value="">Igual al Titular</option>
                                                {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2"><span>Redondez</span><span>{project.slides[activeSlideIdx].ctaRoundness}px</span></div>
                                            <input type="range" min="0" max="30" value={project.slides[activeSlideIdx].ctaRoundness} onChange={(e) => updateSlide(activeSlideIdx, { ctaRoundness: parseInt(e.target.value) })} className="w-full h-2 bg-neutral-700 rounded-lg accent-white mt-1 cursor-pointer" />
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Sombra 3D</label>
                                            <button 
                                                onClick={() => updateSlide(activeSlideIdx, { ctaShadow: !project.slides[activeSlideIdx].ctaShadow })}
                                                className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${project.slides[activeSlideIdx].ctaShadow ? 'bg-green-500' : 'bg-neutral-700'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${project.slides[activeSlideIdx].ctaShadow ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIDEO TAB */}
                        {editorTab === 'video' && (
                            <div className="space-y-6 animate-in fade-in duration-300 p-2">
                                <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-3xl space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                            <Video className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-widest text-white">Generar Video (Veo)</h3>
                                            <p className="text-[10px] text-neutral-500 font-bold">Transforma esta slide en una animación</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Prompt de Animación</label>
                                        <textarea 
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            placeholder="Ej: 'Una cámara lenta acercándose al producto con partículas de luz flotando'..."
                                            className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-amber-500/50 outline-none resize-none h-32 leading-relaxed"
                                        />
                                    </div>

                                    {isVideoGenerating && (
                                        <div className="space-y-3 p-4 bg-black/40 rounded-2xl border border-white/5 animate-pulse">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                                <span className="text-xs font-bold text-amber-200">{videoProgress}</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 w-1/2" />
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleGenerateVideo}
                                        disabled={isVideoGenerating || !videoPrompt.trim()}
                                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isVideoGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        GENERAR VIDEO CON VEO
                                    </button>

                                    <p className="text-[10px] text-neutral-500 text-center leading-relaxed">
                                        Veo generará un video de 5-7 segundos basado en tu prompt y la imagen actual. El proceso puede tardar hasta 2 minutos.
                                    </p>
                                </div>

                                {project.slides[activeSlideIdx].videoUrl && (
                                    <div className="space-y-4 animate-in zoom-in duration-500">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Resultado Generado</label>
                                            <button 
                                                onClick={() => updateSlide(activeSlideIdx, { videoUrl: null })}
                                                className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                ELIMINAR
                                            </button>
                                        </div>
                                        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                                            <video 
                                                src={project.slides[activeSlideIdx].videoUrl!} 
                                                controls 
                                                className="w-full h-full object-cover"
                                                autoPlay
                                                loop
                                                muted
                                            />
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <a 
                                                    href={project.slides[activeSlideIdx].videoUrl!} 
                                                    download="video-generado.mp4"
                                                    className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-white hover:text-black transition-all"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
