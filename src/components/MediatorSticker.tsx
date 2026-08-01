import React from 'react';
import { motion } from 'motion/react';
import {
  Compass, Activity, Heart, Accessibility, LayoutGrid,
  BookOpen, ShieldCheck, Code2, Sparkles
} from 'lucide-react';

type StickerState = 'idle' | 'selected' | 'thinking' | 'celebrating' | 'alert';

interface MediatorStickerProps {
  mediatorId?: string;
  size?: number;
  state?: StickerState;
  className?: string;
  label?: string;
}

const STICKERS: Record<string, {
  symbol: React.ElementType;
  face: string;
  accent: string;
  accentSoft: string;
  rotate: number;
}> = {
  'med-pesquisa': {
    symbol: Compass,
    face: 'rounded-[46%_54%_52%_48%/52%_45%_55%_48%]',
    accent: '#F6B73C',
    accentSoft: '#FFF1C7',
    rotate: -4,
  },
  'med-ux': {
    symbol: Activity,
    face: 'rounded-[55%_45%_47%_53%/42%_52%_48%_58%]',
    accent: '#43B581',
    accentSoft: '#DDF7EA',
    rotate: 3,
  },
  'med-bioetico': {
    symbol: Heart,
    face: 'rounded-[50%_50%_42%_58%/45%_48%_52%_55%]',
    accent: '#F0627E',
    accentSoft: '#FFE1E8',
    rotate: -2,
  },
  'med-acessibilidade': {
    symbol: Accessibility,
    face: 'rounded-[43%_57%_54%_46%/52%_48%_52%_48%]',
    accent: '#6C63D9',
    accentSoft: '#E7E5FF',
    rotate: 4,
  },
  'med-visual': {
    symbol: LayoutGrid,
    face: 'rounded-[58%_42%_48%_52%/46%_56%_44%_54%]',
    accent: '#9A65D6',
    accentSoft: '#F0E2FF',
    rotate: -5,
  },
  'med-documentacao': {
    symbol: BookOpen,
    face: 'rounded-[47%_53%_57%_43%/54%_43%_57%_46%]',
    accent: '#4DA5D9',
    accentSoft: '#DFF3FF',
    rotate: 3,
  },
  'med-heuristicas': {
    symbol: ShieldCheck,
    face: 'rounded-[52%_48%_44%_56%/47%_55%_45%_53%]',
    accent: '#2D9C72',
    accentSoft: '#D8F6E9',
    rotate: -3,
  },
  'med-implementacao': {
    symbol: Code2,
    face: 'rounded-[45%_55%_50%_50%/55%_45%_55%_45%]',
    accent: '#1689C7',
    accentSoft: '#DBF2FF',
    rotate: 4,
  },
};

export default function MediatorSticker({
  mediatorId = 'med-pesquisa',
  size = 72,
  state = 'idle',
  className = '',
  label,
}: MediatorStickerProps) {
  const config = STICKERS[mediatorId] || STICKERS['med-pesquisa'];
  const Symbol = config.symbol;

  const animate = state === 'thinking'
    ? { y: [0, -4, 0], rotate: [config.rotate - 2, config.rotate + 2, config.rotate - 2] }
    : state === 'celebrating'
      ? { y: [0, -8, 0], rotate: [config.rotate, config.rotate + 7, config.rotate - 5, config.rotate] }
      : state === 'alert'
        ? { x: [0, -2, 2, -2, 0], rotate: config.rotate }
        : { y: [0, -2, 0], rotate: config.rotate };

  return (
    <motion.div
      className={`mediator-sticker relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, scale: 0.72, rotate: config.rotate - 12 }}
      animate={{ opacity: 1, scale: state === 'selected' ? 1.05 : 1, ...animate }}
      transition={
        state === 'thinking'
          ? { duration: 1.15, repeat: Infinity, ease: 'easeInOut' }
          : state === 'idle'
            ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            : { type: 'spring', stiffness: 280, damping: 18 }
      }
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      <div
        className={`mediator-sticker__shadow absolute inset-[8%] translate-y-[8%] ${config.face}`}
        style={{ background: 'rgba(26,26,26,.16)' }}
      />

      <div
        className={`mediator-sticker__body absolute inset-[7%] border-[3px] border-[#1A1A1A] ${config.face}`}
        style={{ background: config.accentSoft }}
      >
        <span
          className="mediator-sticker__patch absolute -right-[5%] -top-[5%] flex h-[38%] w-[38%] items-center justify-center rounded-full border-[3px] border-[#1A1A1A]"
          style={{ background: config.accent }}
        >
          <Symbol size={Math.max(12, size * 0.19)} strokeWidth={2.4} color="#1A1A1A" />
        </span>

        <span className="mediator-sticker__eye mediator-sticker__eye--left absolute left-[25%] top-[43%] h-[8%] w-[8%] rounded-full bg-[#1A1A1A]" />
        <span className="mediator-sticker__eye mediator-sticker__eye--right absolute right-[25%] top-[43%] h-[8%] w-[8%] rounded-full bg-[#1A1A1A]" />

        <span className={`mediator-sticker__mouth absolute left-1/2 top-[58%] -translate-x-1/2 border-[#1A1A1A] ${
          state === 'alert'
            ? 'h-[12%] w-[12%] rounded-full border-[2px]'
            : 'h-[9%] w-[24%] rounded-b-full border-b-[3px]'
        }`} />

        <span className="absolute bottom-[14%] left-[14%] h-[7%] w-[15%] -rotate-12 rounded-full opacity-70" style={{ background: config.accent }} />
        <span className="absolute bottom-[10%] right-[18%] h-[6%] w-[10%] rotate-12 rounded-full opacity-45" style={{ background: config.accent }} />
      </div>

      {(state === 'thinking' || state === 'selected') && (
        <motion.span
          className="absolute -right-[5%] -top-[8%] text-[#1A1A1A]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.75, 1.1, 0.75], rotate: [0, 10, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          <Sparkles size={Math.max(14, size * 0.22)} fill={config.accent} />
        </motion.span>
      )}
    </motion.div>
  );
}
