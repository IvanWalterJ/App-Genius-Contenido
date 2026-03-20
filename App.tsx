
import React, { useState, useRef, useEffect } from 'react';
import { AdProject, GenerationStatus, Slide, ContentIntent, VisualStyle, AspectRatio, GenerationMode, BrandContext } from './types';
import { generateAdCopy, generateSlideImage, enhancePrompt, regenerateSlideCopy, editImage, generateVideo, getApiKey, generateVisualPromptForSlide } from './services/geminiService';
import { getHistory, saveToHistory, deleteFromHistory } from './services/historyService';
import { supabase, useCredit } from './services/supabase';
import { useAuth } from './components/AuthContext';
import { Login } from './components/Login';
import SlideCard from './components/SlideCard';
import { STYLE_CONFIGS, FONT_OPTIONS } from './constants';

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
    Minus, Plus, History, Trash2, Calendar, Video, Play, User, X, Briefcase, FolderHeart
} from 'lucide-react';

const QUICK_COLORS = ['#ffffff', '#000000', '#06b6d4', '#8b5cf6', '#d946ef', '#f43f5e', '#3b82f6'];

// Custom styled dropdown — replaces native <select> (looks like Windows XP otherwise)
const CustomSelect: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    className?: string;
}> = ({ value, onChange, options, className = '' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
    const selectedLabel = options.find(o => o.value === value)?.label || value;
    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-full px-4 py-2 text-xs font-bold text-bone-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer whitespace-nowrap"
            >
                {selectedLabel}
                <ChevronLeft className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${open ? 'rotate-90' : '-rotate-90'}`} />
            </button>
            {open && (
                <div className="absolute top-full mt-2 left-0 z-[999] min-w-[170px] bg-[#141414] border border-white/10 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors hover:bg-white/5 ${opt.value === value ? 'text-accent-primary bg-accent-primary/10' : 'text-neutral-300'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
    const { user, profile, loading, signOut, refreshProfile } = useAuth();
    const [hasKey, setHasKey] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [genMode, setGenMode] = useState<GenerationMode>('single-image');
    const [intent, setIntent] = useState<ContentIntent>('paid-ads');
    const [style, setStyle] = useState<VisualStyle>('auto');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
    const [slideCount, setSlideCount] = useState<number>(6); // number of slides/images to generate
    const [manualSlides, setManualSlides] = useState<Array<{ headline: string; subHeadline: string; cta?: string }>>([
        { headline: '', subHeadline: '' },
        { headline: '', subHeadline: '' },
        { headline: '', subHeadline: '' },
    ]);

    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [project, setProject] = useState<AdProject | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeSlideIdx, setActiveSlideIdx] = useState(0);

    // New features state
    const [refImages, setRefImages] = useState<string[]>([]);
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
    const [winnerToast, setWinnerToast] = useState(false);

    // Editor Tabs
    const [editorTab, setEditorTab] = useState<'text' | 'image' | 'design' | 'video'>('text');

    // Sidebar Mode (Create vs History vs Winners vs Assets vs Brands)
    const [sidebarMode, setSidebarMode] = useState<'create' | 'carousels' | 'history' | 'winners' | 'brands'>('create');
    const [history, setHistory] = useState<AdProject[]>([]);

    // Knowledge Base & Prompt Enhancer State
    const [knowledgeBase, setKnowledgeBase] = useState<string | null>(null);
    const [kbFileName, setKbFileName] = useState<string | null>(null);
    const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
    const designInputRef = useRef<HTMLInputElement>(null);

    const [useAiDesign, setUseAiDesign] = useState(true);

    const [brandContext, setBrandContext] = useState<BrandContext>({ name: '', niche: '', targetAudience: '', tone: 'Profesional y Persuasivo' });

    const [designReferences, setDesignReferences] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    // Check API Key on mount & Load History
    useEffect(() => {
        const checkKey = async () => {
            const win = window as any;

            // Tier 1: Check if the AI Studio wrapper has a selected key
            if (win.aistudio && win.aistudio.hasSelectedApiKey) {
                const has = await win.aistudio.hasSelectedApiKey();
                if (has) {
                    setHasKey(true);
                    return;
                }
            }

            // Tier 2: Check if there's an API Key in the environment (Vercel/Local)
            const envKey = getApiKey();
            if (envKey) {
                console.log("Found API Key in environment variables.");
                setHasKey(true);
            } else {
                console.warn("No API Key found in AI Studio or Environment Variables.");
                setHasKey(false);
            }
        };
        checkKey();
    }, []);

    // Load data specific to the authenticated user
    useEffect(() => {
        if (!user) {
            setHistory([]);
            setProject(null);
            setBrandContext({ name: '', niche: '', targetAudience: '', tone: 'Profesional y Persuasivo' });
            return;
        }

        // Load Brand DNA
        try {
            const savedDNA = localStorage.getItem(`novaads_brand_context_${user.id}`);
            if (savedDNA) {
                setBrandContext(JSON.parse(savedDNA));
            } else {
                setBrandContext({ name: '', niche: '', targetAudience: '', tone: 'Profesional y Persuasivo' });
            }
        } catch {}

        // Load History
        const existingHistory = getHistory(user.id);
        const strippedHistory = existingHistory.map(p => ({
            ...p,
            slides: p.slides.map(s => ({ ...s, backgroundImageUrl: null as string | null }))
        }));
        try {
            localStorage.setItem(`adgenius_history_v1_${user.id}`, JSON.stringify(strippedHistory.slice(0, 3)));
        } catch { localStorage.removeItem(`adgenius_history_v1_${user.id}`); }
        setHistory(strippedHistory);
    }, [user]);

    const handleConnectKey = async () => {
        const win = window as any;
        if (win.aistudio && win.aistudio.openSelectKey) {
            await win.aistudio.openSelectKey();
            setHasKey(true);
        }
    };

    const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setRefImages(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
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

    const handleDesignRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => setDesignReferences(prev => [...prev, reader.result as string]);
                reader.readAsDataURL(file);
            });
        }
    };

    const handleEnhancePrompt = async () => {
        if (!prompt.trim()) return;
        setIsEnhancingPrompt(true);
        setError(null);
        try {
            const improved = await enhancePrompt(prompt);
            setPrompt(improved);
        } catch (err: any) {
            setError(`Error al optimizar prompt: ${err.message || 'Inténtalo de nuevo.'}`);
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
        console.error("AI Error Captured:", err);
        setStatus('error'); // Reset to error status to enable the button again
        const msg = (err.message || "").toLowerCase();

        if (msg.includes("leaked")) {
            // Do not redirect, just show the fat message
            setError("⛔ ERROR: Esta clave de API ha sido BLOQUEADA por Google porque se detectó como 'filtrada' (leaked). Debes generar una NUEVA clave en Google AI Studio y enviármela.");
        } else if (msg.includes("permission_denied")) {
            setHasKey(false);
            setError("Error de autenticación: Tu llave de API no tiene permisos o ha sido bloqueada. Por favor, revisa tu cuenta de Google AI Studio.");
            const win = window as any;
            if (win.aistudio && win.aistudio.openSelectKey) {
                win.aistudio.openSelectKey();
            }
        } else if (msg === "all_ai_failed" || msg === "all_image_models_failed") {
            setError("Todos los modelos de IA fallaron al generar el contenido. Esto puede ser por saturación del servicio o una restricción de tu cuenta.");
        } else {
            setError(err.message || 'Error al procesar con IA. Verifica tu conexión o cuota.');
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || !user) return;

        // Check credits
        if (profile && profile.credits <= 0) {
            setError("No tienes créditos suficientes. Tu límite mensual de 50 ha sido alcanzado.");
            return;
        }

        setStatus('generating-copy');
        setError(null);
        setActiveSlideIdx(0);

        try {
            // Deduct credit (blocks here)
            await useCredit(user.id);

            // Trigger profile refresh in background so it doesn't stall the main AI flow
            refreshProfile().catch(console.error);

            let copyResult: any;
            if (genMode === 'manual-carousel') {
                // Manual mode: user provided text per slide — generate visual prompts via AI
                const validManualSlides = manualSlides.filter(s => s.headline.trim());
                if (validManualSlides.length === 0) {
                    setError("Agrega al menos una slide con un titular.");
                    setStatus('idle');
                    return;
                }
                const slidesWithPrompts = await Promise.all(
                    validManualSlides.map(async (slide, idx) => {
                        const visualPrompt = await generateVisualPromptForSlide(
                            slide.headline, slide.subHeadline || '', idx, validManualSlides.length,
                            brandContext, style, prompt
                        ).catch(() => `Professional advertising scene for ${brandContext.niche || 'business'}, cinematic lighting, high-end production quality`);
                        return { headline: slide.headline, subHeadline: slide.subHeadline || '', cta: slide.cta || '', visualPrompt, layout: 'centered', angleLabel: `SLIDE ${idx + 1}` };
                    })
                );
                copyResult = {
                    title: prompt || 'Carrusel Manual',
                    designTheme: { primaryColor: '#050505', accentColor: '#f97316', headlineFont: 'font-sans' },
                    slides: slidesWithPrompts
                };
            } else {
                copyResult = await generateAdCopy(
                    prompt, genMode as 'carousel' | 'single-image' | 'angles-batch', intent, style, brandContext,
                    designReferences.length > 0 ? designReferences : undefined, knowledgeBase || undefined,
                    refImages.length > 0 ? refImages : undefined, slideCount
                );
            }

            // Enforce slide count limit (critical for single-image bug fix)
            const maxSlides = genMode === 'single-image' ? 1 : (genMode === 'angles-batch' ? 6 : (genMode === 'manual-carousel' ? manualSlides.filter(s => s.headline.trim()).length : slideCount));
            const rawSlides = (copyResult.slides || []).slice(0, maxSlides);

            const newProject: AdProject = {
                id: Math.random().toString(36).substr(2, 9),
                createdAt: Date.now(),
                title: copyResult.title || 'Nueva Campaña',
                goal: prompt,
                intent,
                mode: genMode,
                visualStyle: style,
                aspectRatio,
                brandContext,
                isAiDesign: useAiDesign,
                primaryColor: (useAiDesign && copyResult.designTheme?.primaryColor) || '#050505',
                accentColor: (useAiDesign && copyResult.designTheme?.accentColor) || userAccentColor || '#f97316',
                accentGradient: `linear-gradient(to right, ${(useAiDesign && copyResult.designTheme?.accentColor) || userAccentColor || '#f97316'}, ${(useAiDesign && copyResult.designTheme?.accentColor) || userAccentColor || '#f97316'}dd)`,
                slides: rawSlides.map((s: any, idx: number) => {
                    let defaultY = 50;
                    if (s.layout === 'bottom-heavy') defaultY = 75;
                    if (s.layout === 'top-heavy') defaultY = 25;

                    return {
                        ...s,
                        id: `slide-${idx}`,
                        overlayOpacity: 0.4,
                        customStyle: undefined,

                        headlineSize: s.headlineSize || (genMode === 'single-image' ? 64 : 48),
                        headlineColor: '#ffffff',
                        headlineFont: (useAiDesign && copyResult.designTheme?.headlineFont) || 'font-sans',
                        headlineLineHeight: 1.1,
                        headlineFontWeight: '800',
                        headlineGradient: null,
                        headlineBgColor: null,

                        highlightColor: (useAiDesign && copyResult.designTheme?.accentColor) || userAccentColor || '#f97316',
                        highlightFont: (useAiDesign && copyResult.designTheme?.headlineFont) || 'font-sans',
                        highlightFontWeight: '800',

                        subHeadlineSize: s.subHeadlineSize || (genMode === 'single-image' ? 20 : 16),
                        subHeadlineColor: '#eeeeee',
                        subHeadlineFont: (useAiDesign && copyResult.designTheme?.subHeadlineFont) || 'font-sans',
                        subHeadlineLineHeight: 1.4,
                        subHeadlineFontWeight: '400',

                        ctaColor: (useAiDesign && copyResult.designTheme?.ctaColor) || '#000000',
                        ctaBgColor: (useAiDesign && copyResult.designTheme?.ctaBgColor) || (useAiDesign && copyResult.designTheme?.accentColor) || userAccentColor || '#f97316',
                        ctaBgGradient: null,
                        ctaRoundness: 8,
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
            for (let i = 0; i < updatedSlides.length; i++) {
                if (i > 0) await new Promise(r => setTimeout(r, 200));

                let imageUrl: string | null = null;
                let imageError: string | undefined = undefined;

                try {
                    imageUrl = await generateSlideImage(
                        updatedSlides[i].visualPrompt,
                        style,
                        aspectRatio,
                        {
                            characterReference: refImages.length > 0 ? refImages : undefined,
                            styleReference: designReferences.length > 0 ? designReferences : undefined,
                            headline: updatedSlides[i].headline,
                            subHeadline: updatedSlides[i].subHeadline,
                            headlineFont: updatedSlides[i].headlineFont,
                            brandColors: brandContext.colorPalette || undefined,
                        }
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

            // Save to Supabase DB (Background save to avoid stalling UI)
            supabase.from('generations').insert({
                user_id: user.id,
                type: genMode,
                content: finalProject
            }).then(({ error }) => {
                if (error) console.error("History Save Error:", error);
                else console.log("Generation saved to Supabase");
            });

            // Do NOT overwrite project state here to avoid reverting user edits
            const updatedHistory = saveToHistory(finalProject);
            setHistory(updatedHistory);
            setStatus('done'); // Success! Unlock button early
        } catch (err: any) {
            handleAIError(err);
        } finally {
            // Always ensure status is reset to a state that unlocks the button
            setStatus('idle');
        }
    };

    const handleRegenerateSlideImage = async () => {
        if (!project) return;
        setRegeneratingImage(true);
        const slideIdx = activeSlideIdx;
        const currentSlide = project.slides[slideIdx];
        try {
            const newUrl = await generateSlideImage(
                currentSlide.visualPrompt,
                project.visualStyle,
                project.aspectRatio,
                {
                    characterReference: refImages.length > 0 ? refImages : undefined,
                    styleReference: designReferences.length > 0 ? designReferences : undefined,
                    headline: currentSlide.headline,
                    subHeadline: currentSlide.subHeadline,
                    headlineFont: currentSlide.headlineFont,
                    brandColors: project.brandContext?.colorPalette || undefined,
                }
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
                currentSlide.backgroundImageUrl ? [currentSlide.backgroundImageUrl] : []
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
            return { ...prev, slides: newSlides };
        });
    };

    // Persist Business DNA to localStorage whenever it changes
    useEffect(() => {
        if (!user) return;
        try { localStorage.setItem(`novaads_brand_context_${user.id}`, JSON.stringify(brandContext)); } catch {}
    }, [brandContext, user]);

    // Persist project to history whenever it changes (outside the setProject updater)
    useEffect(() => {
        if (!project || !user) return;
        const newHistory = saveToHistory(project, user.id);
        setHistory(newHistory);
    }, [project, user]);

    // Map legacy style names from old projects to new simplified styles
    const LEGACY_STYLE_MAP: Record<string, VisualStyle> = {
        'cinematic-thriller': 'cinematic', 'tech-agency': 'minimal', 'satirical-split': 'bold',
        'brutalism': 'bold', 'clean': 'minimal', 'organic': 'editorial',
        'luxury': 'cinematic', 'meme': 'bold', '3d-clay': 'minimal', 'novela-grafica': 'cinematic',
    };

    const loadProject = (p: AdProject) => {
        const migratedStyle = (STYLE_CONFIGS[p.visualStyle] ? p.visualStyle : LEGACY_STYLE_MAP[p.visualStyle] || 'auto') as VisualStyle;
        setProject({ ...p, visualStyle: migratedStyle });
        setAspectRatio(p.aspectRatio);
        setPrompt(p.goal);
        setStyle(migratedStyle);
        setActiveSlideIdx(0);
        setStatus('done');
        if (window.innerWidth < 768) {
            // Close sidebar on mobile if we had that logic, for now just load
        }
    };

    const deleteProject = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        const newHistory = deleteFromHistory(id, user.id);
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

    if (loading) {
        return (
            <div className="min-h-screen bg-deep-bg flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-accent-primary animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    if (!hasKey) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-deep-bg text-white p-4">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.3)]">
                            <Sparkles className="w-10 h-10 text-black" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-3xl font-black uppercase tracking-tight text-bone-white">Acceso Pro Requerido</h1>
                        <p className="text-neutral-400 leading-relaxed font-medium">
                            Para usar los modelos avanzados de generación de imágenes de alta fidelidad (Gemini 3 Pro), necesitas conectar tu API Key de Google AI Studio.
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
        <div className="min-h-screen flex flex-col md:flex-row bg-deep-bg text-bone-white selection:bg-accent-primary/30 font-modern">

            {/* Winner Toast */}
            {winnerToast && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-amber-500 text-black rounded-2xl shadow-2xl shadow-amber-500/30 animate-in slide-in-from-top-4 duration-300">
                    <Crown className="w-5 h-5 fill-black" />
                    <span className="font-black text-sm uppercase tracking-wider">¡Winner guardado!</span>
                    <button onClick={() => { setWinnerToast(false); setSidebarMode('winners'); }} className="ml-2 text-xs font-bold underline hover:no-underline opacity-80">Ver Winners →</button>
                </div>
            )}

            {/* Sidebar Pomelli Style */}
            <aside className="w-[80px] md:w-[260px] border-r border-white/5 py-8 md:px-6 flex flex-col gap-8 bg-deep-surface/40 h-screen sticky top-0 z-50 transition-all">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/20 shrink-0">
                        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-black" />
                    </div>
                    <div className="hidden md:block">
                        <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-bone-white font-brand">NovaAds <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">AI</span></h1>
                        <p className="text-[10px] text-neutral-400 font-bold tracking-widest mt-1">EXPERIMENT</p>
                    </div>
                </div>

                {/* Navigation Menu */}
                <div className="flex flex-col gap-2 flex-1 mt-4">
                    <button onClick={() => setSidebarMode('brands')} className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${sidebarMode === 'brands' ? 'bg-white/10 text-bone-white shadow-sm' : 'text-neutral-500 hover:text-bone-white hover:bg-white/5'}`}>
                        <Settings className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Business DNA</span>
                    </button>
                    <button onClick={() => { setSidebarMode('create'); setProject(null); setGenMode('single-image'); }} className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${sidebarMode === 'create' ? 'bg-accent-primary/20 text-accent-primary shadow-sm' : 'text-neutral-500 hover:text-bone-white hover:bg-white/5'}`}>
                        <Sparkles className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Campaigns</span>
                    </button>
                    <button onClick={() => { setSidebarMode('carousels'); setProject(null); setGenMode('carousel'); }} className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${sidebarMode === 'carousels' ? 'bg-accent-primary/20 text-accent-primary shadow-sm' : 'text-neutral-500 hover:text-bone-white hover:bg-white/5'}`}>
                        <Layers className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Carousels</span>
                    </button>
                    <button onClick={() => setSidebarMode('history')} className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${sidebarMode === 'history' ? 'bg-white/10 text-bone-white shadow-sm' : 'text-neutral-500 hover:text-bone-white hover:bg-white/5'}`}>
                        <History className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">History</span>
                    </button>
                    <button onClick={() => setSidebarMode('winners')} className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${sidebarMode === 'winners' ? 'bg-white/10 text-bone-white shadow-sm' : 'text-neutral-500 hover:text-bone-white hover:bg-white/5'}`}>
                        <Crown className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Winners</span>
                    </button>
                </div>

                {/* User Profile & Credits */}
                <div className="mt-auto md:px-4 md:py-3 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center md:justify-between group cursor-pointer hover:bg-white/[0.05] transition-all" onClick={() => signOut()}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center border border-white/10 uppercase font-black text-xs text-accent-primary shrink-0">
                            {user?.email?.[0]}
                        </div>
                        <div className="hidden md:flex flex-col">
                            <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Credits</span>
                            <span className="text-sm font-black text-bone-white">{profile?.credits ?? 0}</span>
                        </div>
                    </div>
                    <XCircle className="hidden md:block w-4 h-4 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
            </aside>

            {/* Area de Visualización */}
            <main className="flex-1 overflow-y-auto bg-deep-bg relative">
                <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-accent-primary/5 via-accent-secondary/5 to-transparent pointer-events-none" />

                {(sidebarMode !== 'create' && sidebarMode !== 'carousels') || !project ? (
                    <div className="flex flex-col items-center pt-16 md:pt-24 px-4 max-w-5xl mx-auto w-full z-10 animate-in fade-in zoom-in duration-700 min-h-screen">

                        {sidebarMode === 'brands' ? (
                            <div className="w-full max-w-2xl bg-deep-surface/80 border border-white/5 p-8 rounded-[32px] space-y-6 shadow-2xl backdrop-blur-xl">
                                <h2 className="text-2xl font-black uppercase text-bone-white tracking-widest flex items-center gap-3"><Settings className="w-6 h-6 text-accent-primary" /> Business DNA</h2>
                                <p className="text-neutral-400 text-sm">Configura la identidad de tu marca para que la IA la tome como contexto al generar copies e imágenes.</p>

                                <div className="grid grid-cols-1 gap-4 mt-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Nombre de la Marca</label>
                                        <input
                                            type="text"
                                            value={brandContext.name}
                                            onChange={(e) => setBrandContext({ ...brandContext, name: e.target.value })}
                                            placeholder="Ej: Mi Agencia, Nike, Apple..."
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-accent-primary/50 outline-none transition-all placeholder:text-neutral-700 text-bone-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Nicho / Industria</label>
                                        <input
                                            type="text"
                                            value={brandContext.niche}
                                            onChange={(e) => setBrandContext({ ...brandContext, niche: e.target.value })}
                                            placeholder="Ej: Fitness, Real Estate, SaaS..."
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-accent-primary/50 outline-none transition-all placeholder:text-neutral-700 text-bone-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Público Objetivo</label>
                                        <input
                                            type="text"
                                            value={brandContext.targetAudience}
                                            onChange={(e) => setBrandContext({ ...brandContext, targetAudience: e.target.value })}
                                            placeholder="Ej: Emprendedores de 25-40 años..."
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-accent-primary/50 outline-none transition-all placeholder:text-neutral-700 text-bone-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Tono de Voz</label>
                                        <select
                                            value={brandContext.tone}
                                            onChange={(e) => setBrandContext({ ...brandContext, tone: e.target.value })}
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-accent-primary/50 outline-none transition-all text-bone-white appearance-none"
                                        >
                                            <option value="Profesional y Persuasivo">👔 Profesional y Persuasivo</option>
                                            <option value="Disruptivo y Agresivo">⚡ Disruptivo y Agresivo</option>
                                            <option value="Cercano y Amigable">🤝 Cercano y Amigable</option>
                                            <option value="Lujoso y Exclusivo">💎 Lujoso y Exclusivo</option>
                                            <option value="Divertido e Irreverente">😜 Divertido e Irreverente</option>
                                            <option value="Urgencia y Escasez (FOMO)">⏳ Urgencia y Escasez (FOMO)</option>
                                            <option value="Educativo y Autoridad">🎓 Educativo y Autoridad</option>
                                            <option value="Inspiracional y Emotivo">✨ Inspiracional y Emotivo</option>
                                        </select>
                                    </div>

                                    {/* COLOR PALETTE */}
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Palette className="w-3 h-3 text-accent-primary" />
                                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Paleta de Colores de Marca</label>
                                        </div>
                                        <input
                                            type="text"
                                            value={brandContext.colorPalette || ''}
                                            onChange={(e) => setBrandContext({ ...brandContext, colorPalette: e.target.value })}
                                            placeholder="Ej: Naranja #F97316, Negro #0A0A0A, Blanco hueso #FEF9EF"
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-accent-primary/50 outline-none transition-all placeholder:text-neutral-700 text-bone-white"
                                        />
                                        <p className="text-[10px] text-neutral-600 ml-1">La IA usará estos colores para generar imágenes y copy alineados con tu marca.</p>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {[
                                                { label: 'Onyx + Naranja', value: 'Negro #0A0A0A, Naranja #F97316, Blanco #FEF9EF' },
                                                { label: 'Azul + Dorado', value: 'Azul marino #0F172A, Dorado #F59E0B, Blanco #FFFFFF' },
                                                { label: 'Verde + Negro', value: 'Negro #000000, Verde neón #22C55E, Gris #6B7280' },
                                                { label: 'Violeta + Rosa', value: 'Violeta #7C3AED, Rosa #EC4899, Blanco #FFFFFF' },
                                            ].map(preset => (
                                                <button
                                                    key={preset.label}
                                                    onClick={() => setBrandContext({ ...brandContext, colorPalette: preset.value })}
                                                    className="text-[10px] font-bold px-3 py-1 rounded-full border border-white/10 bg-white/5 text-neutral-400 hover:border-accent-primary/50 hover:text-accent-primary transition-all"
                                                >
                                                    {preset.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* BRAND PERSONALITY */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Personalidad / USP (Opcional)</label>
                                        <textarea
                                            value={brandContext.brandPersonality || ''}
                                            onChange={(e) => setBrandContext({ ...brandContext, brandPersonality: e.target.value })}
                                            placeholder="Ej: Somos la agencia más disruptiva de LATAM..."
                                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-accent-primary/50 outline-none transition-all placeholder:text-neutral-700 text-bone-white resize-none h-20"
                                        />
                                    </div>

                                    {/* Knowledge Base */}
                                    <div className="space-y-2 pt-6 border-t border-white/5">
                                        <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Base de Conocimiento (PDF/TXT)</label>
                                        <div onClick={() => docInputRef.current?.click()} className={`w-full py-3 px-4 border border-dashed rounded-xl flex items-center gap-3 cursor-pointer transition-all ${knowledgeBase ? 'bg-green-500/10 border-green-500/50' : 'bg-deep-surface border-white/10 hover:border-white/20'}`}>
                                            <div className={`p-2 rounded-lg ${knowledgeBase ? 'bg-green-500/20' : 'bg-black/50'}`}>
                                                {knowledgeBase ? <Check className="w-4 h-4 text-green-400" /> : <FileText className="w-4 h-4 text-neutral-400" />}
                                            </div>
                                            <p className={`text-xs font-bold truncate ${knowledgeBase ? 'text-green-300' : 'text-neutral-400'}`}>{kbFileName || "Subir Documento"}</p>
                                            <input type="file" ref={docInputRef} className="hidden" accept=".txt,.md,.json,.csv,.pdf,.doc,.docx" onChange={handleKnowledgeBaseUpload} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : sidebarMode === 'history' || sidebarMode === 'winners' ? (
                            <div className="w-full">
                                <h1 className="text-3xl font-black uppercase tracking-tighter text-bone-white mb-8 flex items-center gap-3">
                                    {sidebarMode === 'history' ? <><History className="w-8 h-8 text-accent-primary" /> History</> : <><Crown className="w-8 h-8 text-yellow-500" /> Winners</>}
                                </h1>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {history && history.length > 0 ? (
                                        history.flatMap(p => p.slides.filter(s => sidebarMode === 'winners' ? s.isWinner : true).map(s => ({ ...s, p })))
                                            .slice(0, 20)
                                            .map((item, i) => (
                                                <div key={i} onClick={() => { loadProject(item.p); setSidebarMode('create'); }} className="bg-deep-surface border border-white/5 rounded-2xl p-3 cursor-pointer hover:border-white/20 transition-all hover:scale-[1.02] group shadow-xl">
                                                    <div className="aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-black/50 relative">
                                                        {item.backgroundImageUrl ? (
                                                            <img src={item.backgroundImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-neutral-600" /></div>
                                                        )}
                                                        {item.isWinner && (
                                                            <div className="absolute top-2 right-2 p-1.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-lg shadow-lg">
                                                                <Crown className="w-3 h-3 text-black fill-black" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="text-sm font-bold truncate text-bone-white">{item.p.title}</h4>
                                                    <p className="text-xs text-neutral-500 capitalize">{item.p.visualStyle}</p>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="col-span-full py-16 text-center border border-dashed border-white/10 rounded-3xl text-neutral-500">
                                            <p>No se encontraron resultados.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // CREATE / MAIN PROMPT SCREEN
                            <div className="w-full flex-col items-center flex">
                                <div className="text-center mb-8 space-y-4">
                                    <h1 className="text-5xl md:text-6xl text-bone-white font-serif italic mb-2 tracking-tight flex items-center justify-center gap-4">{sidebarMode === 'carousels' ? '🎠 Carruseles' : '📣 Campañas'}</h1>
                                    <p className="text-neutral-400 text-sm md:text-base font-medium">{sidebarMode === 'carousels' ? 'Genera carruseles con imágenes limpias, sin texto, para editarlas manualmente en Canva u otra herramienta.' : 'Genera imágenes con texto integrado de alta calidad para tus campañas publicitarias.'}</p>
                                </div>

                                {/* Big Prompt Box */}
                                <div className="w-full max-w-[800px] bg-deep-surface/90 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[32px] p-6 backdrop-blur-3xl flex flex-col gap-4 relative mt-4">
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="Ej: Necesito una landing disruptiva para mi campaña con un copy directo para exterminar curiosos..."
                                        className="w-full bg-transparent border-none text-bone-white text-lg placeholder:text-neutral-600 focus:ring-0 outline-none resize-none min-h-[140px] font-medium"
                                    />

                                    {/* Optimization Button (floating inside textarea) */}
                                    <div className="flex justify-end border-b border-white/5 pb-4">
                                        <button
                                            onClick={handleEnhancePrompt}
                                            disabled={isEnhancingPrompt || !prompt}
                                            className="text-xs flex items-center gap-2 text-accent-primary hover:text-accent-secondary transition-colors font-bold uppercase tracking-wider px-3 py-1 rounded-full hover:bg-accent-primary/10 disabled:opacity-50"
                                        >
                                            {isEnhancingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {isEnhancingPrompt ? "Optimizando..." : "Optimizar Prompt"}
                                        </button>
                                    </div>

                                    {/* Bottom controls row */}
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">

                                            {/* Format Selector */}
                                            <CustomSelect
                                                value={genMode}
                                                onChange={(v) => { setGenMode(v as GenerationMode); setSlideCount(v === 'single-image' ? 1 : 6); }}
                                                options={sidebarMode === 'carousels' ? [
                                                    { value: 'carousel', label: 'Carrusel (IA)' },
                                                    { value: 'manual-carousel', label: 'Carrusel Manual' },
                                                ] : [
                                                    { value: 'single-image', label: 'Una Imagen' },
                                                    { value: 'angles-batch', label: 'Mezcla (Volumen)' },
                                                ]}
                                            />

                                            {/* Style Selector */}
                                            <CustomSelect
                                                value={style}
                                                onChange={(v) => setStyle(v as VisualStyle)}
                                                options={Object.keys(STYLE_CONFIGS).map(s => ({ value: s, label: STYLE_CONFIGS[s].name }))}
                                            />

                                            {/* Aspect Ratio */}
                                            <CustomSelect
                                                value={aspectRatio}
                                                onChange={(v) => setAspectRatio(v as AspectRatio)}
                                                options={[
                                                    { value: '1:1', label: 'Feed (1:1)' },
                                                    { value: '3:4', label: 'Portrait (3:4)' },
                                                    { value: '9:16', label: 'Story (9:16)' },
                                                ]}
                                            />

                                            {/* Slide count — only for IA carousel and volume modes */}
                                            {(genMode === 'carousel' || genMode === 'angles-batch') && (
                                                <div className="flex items-center bg-black/50 rounded-full border border-white/10 px-2 py-1.5 h-[34px]">
                                                    <span className="text-[11px] font-bold px-2 min-w-[50px] text-center text-bone-white">{slideCount} slides</span>
                                                    <div className="flex gap-1 border-l border-white/10 pl-2">
                                                        <button onClick={() => setSlideCount(prev => Math.max(2, prev - 1))} className="hover:text-accent-primary text-neutral-400 p-0.5"><Minus className="w-3 h-3" /></button>
                                                        <button onClick={() => setSlideCount(prev => Math.min(10, prev + 1))} className="hover:text-accent-primary text-neutral-400 p-0.5"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Manual carousel: show live count */}
                                            {genMode === 'manual-carousel' && (
                                                <span className="text-[11px] font-bold px-3 py-1.5 bg-accent-primary/10 border border-accent-primary/20 rounded-full text-accent-primary">
                                                    {manualSlides.filter(s => s.headline.trim()).length} slides definidos
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleGenerate}
                                            disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
                                            className="w-full md:w-auto bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-secondary hover:to-accent-primary disabled:opacity-50 text-black px-6 py-3 rounded-full font-black text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95 shrink-0"
                                        >
                                            {(!status || status === 'idle' || status === 'done' || status === 'error') ? <><Sparkles className="w-4 h-4" /> GENERATE IDEAS</> : <><Loader2 className="w-4 h-4 animate-spin" /> GENERATING...</>}
                                        </button>
                                    </div>
                                </div>

                                {/* Manual Carousel Slide Editor */}
                                {genMode === 'manual-carousel' && (
                                    <div className="w-full max-w-[800px] mt-5">
                                        <div className="bg-deep-surface/80 border border-white/8 rounded-3xl p-5 space-y-4 backdrop-blur-xl">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest text-accent-primary">Slides del Carrusel</p>
                                                    <p className="text-[10px] text-neutral-500 mt-0.5">Escribe el texto de cada slide. La IA genera la imagen perfecta para cada uno.</p>
                                                </div>
                                                <button
                                                    onClick={() => setManualSlides(prev => [...prev, { headline: '', subHeadline: '' }])}
                                                    disabled={manualSlides.length >= 10}
                                                    className="text-xs font-bold px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                >
                                                    <Plus className="w-3 h-3" /> Añadir Slide
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {manualSlides.map((slide, idx) => (
                                                    <div key={idx} className={`border rounded-2xl p-4 space-y-2.5 group transition-colors ${slide.headline.trim() ? 'bg-black/30 border-white/10' : 'bg-black/20 border-white/5'}`}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center ${slide.headline.trim() ? 'bg-accent-primary text-black' : 'bg-white/5 text-neutral-600'}`}>{idx + 1}</span>
                                                                {!slide.headline.trim() && <span className="text-[10px] text-neutral-600 font-bold">Sin contenido — no se generará</span>}
                                                            </div>
                                                            {manualSlides.length > 1 && (
                                                                <button onClick={() => setManualSlides(prev => prev.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10">
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={slide.headline}
                                                            onChange={(e) => setManualSlides(prev => prev.map((s, i) => i === idx ? { ...s, headline: e.target.value } : s))}
                                                            placeholder="Titular principal *"
                                                            className="w-full bg-transparent border-b border-white/10 pb-1.5 text-sm font-bold text-white placeholder:text-neutral-700 outline-none focus:border-accent-primary/50 transition-colors"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={slide.subHeadline}
                                                            onChange={(e) => setManualSlides(prev => prev.map((s, i) => i === idx ? { ...s, subHeadline: e.target.value } : s))}
                                                            placeholder="Subtítulo o descripción"
                                                            className="w-full bg-transparent border-b border-white/5 pb-1.5 text-xs text-neutral-400 placeholder:text-neutral-700 outline-none focus:border-white/20 transition-colors"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={slide.cta || ''}
                                                            onChange={(e) => setManualSlides(prev => prev.map((s, i) => i === idx ? { ...s, cta: e.target.value } : s))}
                                                            placeholder="CTA: ej. COMPRAR AHORA (opcional)"
                                                            className="w-full bg-transparent text-[11px] text-neutral-600 placeholder:text-neutral-700 outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            {refImages.length === 0 && (
                                                <p className="text-[10px] text-neutral-600 border-t border-white/5 pt-3">
                                                    💡 Para consistencia de personajes entre slides, sube una foto con el botón "Personaje" arriba.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* References & Brand DNA bar */}
                                <div className="w-full max-w-[800px] mt-4 space-y-3">
                                    {/* Visual References */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Style Reference Button + Thumbnails */}
                                        <button onClick={() => designInputRef.current?.click()} className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${designReferences.length > 0 ? 'text-accent-secondary bg-accent-secondary/10 border-accent-secondary/30 hover:bg-accent-secondary/20' : 'text-neutral-500 border-white/10 hover:text-accent-secondary hover:border-accent-secondary/30'}`}>
                                            <Layers className="w-3 h-3" /> {designReferences.length > 0 ? `${designReferences.length} ref. visual` : 'Referencia Visual'}
                                        </button>
                                        <input type="file" ref={designInputRef} className="hidden" accept="image/*" multiple onChange={handleDesignRefUpload} />
                                        {designReferences.map((img, idx) => (
                                            <div key={`dr-${idx}`} className="relative group">
                                                <img src={img} className="w-7 h-7 rounded-lg object-cover border border-white/10" alt="Ref" />
                                                <button onClick={() => setDesignReferences(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-2 h-2 text-white" /></button>
                                            </div>
                                        ))}

                                        {/* Character Reference Button + Thumbnails */}
                                        <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${refImages.length > 0 ? 'text-accent-primary bg-accent-primary/10 border-accent-primary/30 hover:bg-accent-primary/20' : 'text-neutral-500 border-white/10 hover:text-accent-primary hover:border-accent-primary/30'}`}>
                                            <Upload className="w-3 h-3" /> {refImages.length > 0 ? `${refImages.length} personaje` : 'Personaje'}
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleRefImageUpload} />
                                        {refImages.map((img, idx) => (
                                            <div key={`cr-${idx}`} className="relative group">
                                                <img src={img} className="w-7 h-7 rounded-full object-cover border border-white/10" alt="Persona" />
                                                <button onClick={() => setRefImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-2 h-2 text-white" /></button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Brand DNA status */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {brandContext.name || brandContext.niche ? (
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                                                <Check className="w-3 h-3" /> Business DNA activo: {brandContext.name || brandContext.niche}
                                            </div>
                                        ) : (
                                            <button onClick={() => setSidebarMode('brands')} className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 hover:text-accent-primary border border-white/5 hover:border-accent-primary/30 px-3 py-1.5 rounded-full transition-all">
                                                <Settings className="w-3 h-3" /> Configura tu Business DNA para mejores resultados →
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-200 text-sm animate-in zoom-in w-full max-w-2xl">
                                        <AlertCircle className="w-5 h-5 inline-block mr-2" />
                                        {error}
                                    </div>
                                )}

                                {/* Recent Campaigns Grid below the prompt box */}
                                <div className="w-full max-w-[900px] mt-20 text-left animate-in slide-in-from-bottom-8 duration-700">
                                    <h3 className="text-lg font-bold text-bone-white mb-6 font-serif px-2">Recent Campaigns</h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        {history && history.length > 0 ? (
                                            history.slice(0, 4).map((proj) => (
                                                <div key={proj.id} onClick={() => loadProject(proj)} className="bg-deep-surface border border-white/5 rounded-2xl p-3 cursor-pointer hover:border-white/20 transition-all hover:scale-[1.02] group">
                                                    <div className="aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-black/50 relative">
                                                        {proj.slides[0]?.backgroundImageUrl ? (
                                                            <img src={proj.slides[0].backgroundImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-neutral-600" /></div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-deep-surface via-transparent to-transparent opacity-60 pointer-events-none" />
                                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">{proj.visualStyle}</div>
                                                    </div>
                                                    <h4 className="text-sm font-bold truncate text-bone-white">{proj.title}</h4>
                                                    <p className="text-[10px] text-neutral-500 mt-1 tracking-wider uppercase">{new Date(proj.createdAt || Date.now()).toLocaleDateString()}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-3xl text-neutral-500 text-sm">
                                                No recent campaigns found.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-7xl space-y-8 md:space-y-12 pb-32 z-10 px-4 md:px-12 mx-auto">
                        {/* Header */}
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-md text-xs font-black uppercase bg-white text-black">{project.intent}</span>
                                    {project.mode === 'angles-batch'
                                        ? <span className="text-xs text-purple-400 font-bold uppercase tracking-widest bg-purple-900/20 px-3 py-1 rounded-md border border-purple-500/30">MODO VOLUMEN</span>
                                        : <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest bg-neutral-900 px-3 py-1 rounded-md border border-white/10">{refImages.length > 0 ? 'CLONED' : `${project.visualStyle}`}</span>
                                    }
                                </div>
                                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter max-w-3xl leading-none mt-2">{project.title}</h2>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => {
                                        const isNowWinner = !project.slides[activeSlideIdx].isWinner;
                                        updateSlide(activeSlideIdx, { isWinner: isNowWinner });
                                        if (isNowWinner) {
                                            setWinnerToast(true);
                                            setTimeout(() => setWinnerToast(false), 3500);
                                        }
                                    }}
                                    className={`p-4 rounded-xl transition-all border ${project.slides[activeSlideIdx].isWinner ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-500 text-black' : 'bg-neutral-900 border-white/10 text-neutral-500 hover:text-white'}`}
                                    title="Marcar como Winner"
                                >
                                    <Crown className={`w-6 h-6 ${project.slides[activeSlideIdx].isWinner ? 'fill-black' : ''}`} />
                                </button>
                                <button onClick={() => setShowSafeZones(!showSafeZones)} className={`p-4 rounded-xl transition-all border ${showSafeZones ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-neutral-900 border-white/10 text-neutral-500 hover:text-white'}`} title="Mostrar Zonas Seguras"><LayoutTemplate className="w-6 h-6" /></button>
                                <button onClick={handleDownloadCurrent} disabled={isExporting} className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50">
                                    {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} DESCARGAR
                                </button>
                            </div>
                        </header >

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-16">
                            {/* Canvas View */}
                            <div className="xl:col-span-7 flex flex-col items-center gap-8">
                                <div className="relative w-full flex flex-col md:flex-row items-center justify-center group gap-4">
                                    <button onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))} className="hidden md:block absolute -left-16 z-30 p-5 bg-neutral-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 text-white shadow-xl" disabled={activeSlideIdx === 0}><ChevronLeft className="w-8 h-8" /></button>

                                    <div className="w-full max-w-[580px] px-2 md:px-0 animate-in slide-in-from-right-8 duration-500 relative ring-1 ring-white/10 shadow-2xl transition-all">
                                        <div className="relative flex justify-center">
                                            <SlideCard
                                                id="active-slide-export"
                                                slide={project.slides[activeSlideIdx]}
                                                index={activeSlideIdx}
                                                aspectRatio={project.aspectRatio}
                                                showSafeZones={showSafeZones}
                                                hideNumbering={genMode === 'angles-batch'}
                                            />
                                        </div>
                                    </div>

                                    <button onClick={() => setActiveSlideIdx(Math.min(project.slides.length - 1, activeSlideIdx + 1))} className="hidden md:block absolute -right-16 z-30 p-5 bg-neutral-900 border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 text-white shadow-xl" disabled={activeSlideIdx === project.slides.length - 1}><ChevronRight className="w-8 h-8" /></button>

                                    {/* Mobile Navigation */}
                                    <div className="flex md:hidden w-full justify-between items-center px-4">
                                        <button onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))} className="p-3 bg-neutral-900 border border-white/10 rounded-full text-white" disabled={activeSlideIdx === 0}><ChevronLeft className="w-6 h-6" /></button>
                                        <span className="text-xs font-bold text-neutral-500">{activeSlideIdx + 1} / {project.slides.length}</span>
                                        <button onClick={() => setActiveSlideIdx(Math.min(project.slides.length - 1, activeSlideIdx + 1))} className="p-3 bg-neutral-900 border border-white/10 rounded-full text-white" disabled={activeSlideIdx === project.slides.length - 1}><ChevronRight className="w-6 h-6" /></button>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    {project.slides.map((_, i) => (
                                        <button key={i} onClick={() => setActiveSlideIdx(i)} className={`h-2 transition-all rounded-full ${i === activeSlideIdx ? 'w-16 bg-white shadow-[0_0_15px_white]' : 'w-4 bg-neutral-800 hover:bg-neutral-600'}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Advanced Editor Panel */}
                            <div className="xl:col-span-5 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
                                <div className="p-4 md:p-6 bg-neutral-900/80 border border-white/10 rounded-2xl md:rounded-[32px] space-y-6 backdrop-blur-md shadow-2xl">

                                    {/* Top Actions */}
                                    <div className={`grid gap-3 ${(project.mode === 'carousel' || project.mode === 'manual-carousel') ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {project.mode !== 'carousel' && project.mode !== 'manual-carousel' && (
                                            <button onClick={handleRegenerateSlideCopy} disabled={regeneratingCopy} className="bg-accent-primary/10 hover:bg-accent-primary/20 p-4 rounded-2xl text-xs font-bold text-accent-primary flex items-center justify-center gap-3 border border-accent-primary/30 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.1)]">
                                                {regeneratingCopy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} REESCRIBIR COPY
                                            </button>
                                        )}
                                        <button onClick={handleRegenerateSlideImage} disabled={regeneratingImage} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-xs font-bold text-bone-white flex items-center justify-center gap-3 border border-white/10 transition-all hover:scale-[1.02]">
                                            {regeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} NUEVA IMAGEN
                                        </button>
                                    </div>

                                    {/* Editor Tabs — Carousels only get image tab */}
                                    {(project.mode === 'carousel' || project.mode === 'manual-carousel') ? (
                                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                            <button className="flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 bg-neutral-800 text-white shadow-lg">
                                                <ImageIcon className="w-4 h-4" /> IMAGEN
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                                            <button onClick={() => setEditorTab('text')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${editorTab === 'text' ? 'bg-neutral-800 text-white shadow-lg scale-100' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                                                <TypeIcon className="w-4 h-4" /> TEXTO
                                            </button>
                                            <button onClick={() => setEditorTab('image')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${editorTab === 'image' ? 'bg-neutral-800 text-white shadow-lg scale-100' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`}>
                                                <ImageIcon className="w-4 h-4" /> IMAGEN
                                            </button>
                                        </div>
                                    )}

                                    {/* TEXT EDITOR TAB — Only for non-carousel modes */}
                                    {editorTab === 'text' && project.mode !== 'carousel' && project.mode !== 'manual-carousel' && (
                                        <div className="space-y-5 animate-in fade-in duration-300">

                                            <div className="space-y-4 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                                <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Texto del Botón (CTA)</label>
                                                <input
                                                    type="text"
                                                    value={project.slides[activeSlideIdx].cta || ''}
                                                    onChange={(e) => updateSlide(activeSlideIdx, { cta: e.target.value })}
                                                    placeholder="Ej: COMPRAR AHORA"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm font-bold text-white focus:ring-1 ring-white/20 outline-none"
                                                />
                                            </div>

                                            <div className="space-y-4 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                                <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Titular Publicitario</label>
                                                <textarea
                                                    value={project.slides[activeSlideIdx].headline}
                                                    onChange={(e) => updateSlide(activeSlideIdx, { headline: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-base font-bold h-24 text-white focus:ring-1 ring-white/20 outline-none leading-snug"
                                                />
                                            </div>

                                            <div className="space-y-4 p-5 bg-neutral-800/20 border border-white/5 rounded-2xl">
                                                <label className="text-xs font-black uppercase tracking-widest text-neutral-400">Sub-titular / Gancho</label>
                                                <textarea
                                                    value={project.slides[activeSlideIdx].subHeadline}
                                                    onChange={(e) => updateSlide(activeSlideIdx, { subHeadline: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-neutral-300 h-20 focus:ring-1 ring-white/20 outline-none leading-snug"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* IMAGE EDITOR TAB — Shown for all modes (carousel mode forces this tab) */}
                                    {(editorTab === 'image' || project.mode === 'carousel' || project.mode === 'manual-carousel') && (
                                        <div className="space-y-6 animate-in fade-in duration-300 p-2">
                                            {/* VISUAL PROMPT EDITOR */}
                                            <div className="space-y-3 pb-6 border-b border-white/5">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Prompt Visual (IA)</label>
                                                </div>
                                                <textarea
                                                    value={project.slides[activeSlideIdx].visualPrompt}
                                                    onChange={(e) => updateSlide(activeSlideIdx, { visualPrompt: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-neutral-400 focus:text-white focus:border-blue-500/50 outline-none resize-none h-24 leading-relaxed font-mono"
                                                    placeholder="Describe la imagen que quieres..."
                                                />
                                                <p className="text-[10px] text-neutral-600">
                                                    Edita este texto y pulsa <strong className="text-neutral-400">"NUEVA IMAGEN"</strong> arriba para aplicar cambios.
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                                <label className="text-xs font-black uppercase tracking-widest text-neutral-500">Imagen de Fondo</label>
                                                <button onClick={() => bgInputRef.current?.click()} className="text-xs font-bold text-white hover:underline flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><Upload className="w-4 h-4" /> Subir Propia</button>
                                                <input type="file" ref={bgInputRef} className="hidden" onChange={handleBgImageUpload} accept="image/*" />
                                            </div>

                                            {/* MAGIC EDIT SECTION */}
                                            <div className="p-5 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/5 border border-accent-primary/20 rounded-2xl space-y-4 shadow-lg shadow-orange-500/5">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                                                        <Sparkles className="w-4 h-4 text-accent-primary" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-accent-primary">AI Magic Edit</label>
                                                        <span className="text-[9px] text-neutral-500 font-bold">Edita con lenguaje natural</span>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <textarea
                                                        value={editPrompt}
                                                        onChange={(e) => setEditPrompt(e.target.value)}
                                                        placeholder="Ej: 'Transforma esto en un estilo cyberpunk' o 'Añade un coche deportivo'..."
                                                        className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-cyan-500/50 outline-none resize-none h-24 leading-relaxed"
                                                    />
                                                    <button
                                                        onClick={handleEditImage}
                                                        disabled={isEditingImage || !editPrompt.trim() || !project.slides[activeSlideIdx].backgroundImageUrl}
                                                        className="absolute bottom-3 right-3 p-3 bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-xl hover:scale-110 active:scale-95"
                                                    >
                                                        {isEditingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}




                                </div>
                            </div>
                        </div>
                    </div >
                )}
            </main >
        </div >
    );
};

export default App;
