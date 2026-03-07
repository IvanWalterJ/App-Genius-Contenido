import { readFileSync, writeFileSync } from 'fs';

const file = 'App.tsx';
let content = readFileSync(file, 'utf8');

// Color normalization function (CRLF support)
const crlf = (s) => s.replace(/\n/g, '\r\n');

// 1. REESCRIBIR COPY (Purple -> Orange)
const OLD_REWRITE = `bg-purple-900/30 hover:bg-purple-900/50 p-4 rounded-2xl text-xs font-bold text-purple-200 flex items-center justify-center gap-3 border border-purple-500/20 transition-all hover:scale-[1.02]`;
const NEW_REWRITE = `bg-accent-primary/10 hover:bg-accent-primary/20 p-4 rounded-2xl text-xs font-bold text-accent-primary flex items-center justify-center gap-3 border border-accent-primary/30 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(249,115,22,0.1)]`;

// 2. NUEVA IMAGEN (Blue -> Orange/Neutral)
const OLD_NEWIMAGE = `bg-blue-900/30 hover:bg-blue-900/50 p-4 rounded-2xl text-xs font-bold text-blue-200 flex items-center justify-center gap-3 border border-blue-500/20 transition-all hover:scale-[1.02]`;
const NEW_NEWIMAGE = `bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-xs font-bold text-bone-white flex items-center justify-center gap-3 border border-white/10 transition-all hover:scale-[1.02]`;

// 3. Text Editor IA Badge (Violet -> Orange/Neutral)
const OLD_VBADGE = `border-2 border-dashed border-violet-500/30 rounded-3xl bg-violet-500/5 flex flex-col items-center gap-4`;
const NEW_VBADGE = `border border-white/5 rounded-3xl bg-black/40 flex flex-col items-center gap-4`;

const OLD_VTEXT = `text-sm text-violet-200 font-bold uppercase tracking-widest">IA: Nano Banana 2</p>`;
const NEW_VTEXT = `text-sm text-accent-primary font-bold uppercase tracking-widest">IA: Engine de Respuesta Directa v4</p>`;

const OLD_VSPARKLE = `p-4 bg-violet-500/10 rounded-full`;
const NEW_VSPARKLE = `p-4 bg-accent-primary/10 rounded-full`;

const OLD_VSPARKLE_ICON = `w-8 h-8 text-violet-400`;
const NEW_VSPARKLE_ICON = `w-8 h-8 text-accent-primary`;

const OLD_VTEXT_2 = `text-xs text-violet-400/70 mt-2 max-w-xs mx-auto leading-relaxed`;
const NEW_VTEXT_2 = `text-xs text-neutral-400 mt-2 max-w-xs mx-auto leading-relaxed`;

// 4. AI Magic Edit Section (Cyan/Blue -> Orange)
const OLD_MAGIC_BG = `bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl space-y-4 shadow-lg shadow-cyan-500/5`;
const NEW_MAGIC_BG = `bg-gradient-to-br from-accent-primary/10 to-accent-secondary/5 border border-accent-primary/20 rounded-2xl space-y-4 shadow-lg shadow-orange-500/5`;

const OLD_MAGIC_BADGE = `w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center`;
const NEW_MAGIC_BADGE = `w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center`;

const OLD_MAGIC_SPARKLE = `w-4 h-4 text-cyan-400`;
const NEW_MAGIC_SPARKLE = `w-4 h-4 text-accent-primary`;

const OLD_MAGIC_LABEL = `text-[10px] font-black uppercase tracking-widest text-cyan-400`;
const NEW_MAGIC_LABEL = `text-[10px] font-black uppercase tracking-widest text-accent-primary`;

const OLD_MAGIC_INPUT = `w-full bg-black/60 border border-cyan-500/30 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:ring-1 ring-cyan-500 outline-none transition-all`;
const NEW_MAGIC_INPUT = `w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:ring-1 ring-accent-primary outline-none transition-all`;

const OLD_MAGIC_BTN = `w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2`;
const NEW_MAGIC_BTN = `w-full py-3 bg-accent-primary hover:bg-orange-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2`;


// Apply replacements
content = content.replace(OLD_REWRITE, NEW_REWRITE);
content = content.replace(OLD_NEWIMAGE, NEW_NEWIMAGE);
content = content.replace(OLD_VBADGE, NEW_VBADGE);
content = content.replace(OLD_VTEXT, NEW_VTEXT);
content = content.replace(OLD_VSPARKLE, NEW_VSPARKLE);
content = content.replace(OLD_VSPARKLE_ICON, NEW_VSPARKLE_ICON);
content = content.replace(OLD_VTEXT_2, NEW_VTEXT_2);
content = content.replace(OLD_MAGIC_BG, NEW_MAGIC_BG);
content = content.replace(OLD_MAGIC_BADGE, NEW_MAGIC_BADGE);
content = content.replace(OLD_MAGIC_SPARKLE, NEW_MAGIC_SPARKLE);
content = content.replace(OLD_MAGIC_LABEL, NEW_MAGIC_LABEL);
content = content.replace(OLD_MAGIC_INPUT, NEW_MAGIC_INPUT);
content = content.replace(OLD_MAGIC_BTN, NEW_MAGIC_BTN);

writeFileSync(file, content, 'utf8');
console.log('✅ UI Colors normalized to Onyx/Orange');
