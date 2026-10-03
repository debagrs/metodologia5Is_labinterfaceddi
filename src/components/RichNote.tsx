import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Palette } from 'lucide-react';

const fonts = ['Arial', 'Georgia', 'Courier New', 'Verdana', 'Times New Roman'];

function clean(html: string): string {
  const source = document.createElement('div');
  source.innerHTML = html;
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'FONT', 'DIV', 'P', 'BR']);
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const span = document.createElement('span');
      span.textContent = node.textContent;
      return span.innerHTML;
    }
    if (!(node instanceof HTMLElement)) return '';
    const children = Array.from(node.childNodes).map(walk).join('');
    if (!allowed.has(node.tagName)) return children;
    const tag = node.tagName === 'FONT' ? 'span' : node.tagName.toLowerCase();
    const styles: string[] = [];
    const color = node.style.color || (node.tagName === 'FONT' ? node.getAttribute('color') : '') || '';
    if (/^(#[0-9a-f]{3,8}|rgb\([\d\s,.%]+\))$/i.test(color)) styles.push(`color:${color}`);
    if (fonts.some(f => f.toLowerCase() === node.style.fontFamily.replace(/["']/g, '').toLowerCase())) styles.push(`font-family:${node.style.fontFamily}`);
    if (/^(1[0-9]|2[0-9]|3[0-6])px$/.test(node.style.fontSize)) styles.push(`font-size:${node.style.fontSize}`);
    if (node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) styles.push('font-weight:bold');
    if (node.style.fontStyle === 'italic') styles.push('font-style:italic');
    if (node.style.textDecoration.includes('underline') || node.style.textDecorationLine.includes('underline')) styles.push('text-decoration:underline');
    return `<${tag}${styles.length ? ` style="${styles.join(';')}"` : ''}>${children}</${tag}>`;
  };
  return Array.from(source.childNodes).map(walk).join('');
}

export default function RichNote({ content, onChange, disabled = false }: { content: string; onChange: (content: string) => void; disabled?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const lastSaved = useRef('__initial__');

  useEffect(() => {
    if (editor.current && content !== lastSaved.current && document.activeElement !== editor.current) {
      if (/^<(?:b|strong|i|em|u|span|div|p|br|font)(?:\s|>|\/)/i.test(content)) editor.current.innerHTML = clean(content);
      else editor.current.textContent = content;
      lastSaved.current = content;
    }
  }, [content]);

  const saveSelection = () => {
    const currentSelection = window.getSelection();
    const range = currentSelection?.rangeCount ? currentSelection.getRangeAt(0) : null;
    if (range && editor.current?.contains(range.commonAncestorContainer)) {
      selection.current = range.cloneRange();
    }
  };

  useEffect(() => {
    if (disabled) return;
    const handleSelectionChange = () => saveSelection();
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [disabled]);

  const restore = () => {
    if (!editor.current) return false;
    editor.current.focus({ preventScroll: true });
    if (!selection.current) return false;
    const currentSelection = window.getSelection();
    currentSelection?.removeAllRanges();
    currentSelection?.addRange(selection.current);
    return true;
  };

  const persist = () => {
    if (!editor.current) return;
    const value = clean(editor.current.innerHTML);
    lastSaved.current = value;
    onChange(value);
    saveSelection();
  };

  const command = (name: 'bold' | 'italic' | 'underline' | 'foreColor', value?: string) => {
    restore();
    // Força o navegador a produzir estilos inline, que sobrevivem melhor à sanitização e ao salvamento da nota.
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(name, false, value);
    saveSelection();
    persist();
  };

  const styleSelection = (property: 'fontFamily' | 'fontSize', value: string) => {
    restore();
    const currentSelection = window.getSelection();
    if (!currentSelection?.rangeCount) return;
    const range = currentSelection.getRangeAt(0);
    if (!editor.current?.contains(range.commonAncestorContainer)) return;

    const span = document.createElement('span');
    span.style[property] = value;
    if (range.collapsed) {
      span.appendChild(document.createTextNode('\u200b'));
      range.insertNode(span);
      range.setStart(span.firstChild!, 1);
      range.collapse(true);
    } else {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      range.selectNodeContents(span);
    }

    currentSelection.removeAllRanges();
    currentSelection.addRange(range);
    saveSelection();
    persist();
  };

  return <div className="flex flex-1 min-h-0 flex-col gap-1" onPointerDown={e => e.stopPropagation()}>
    {!disabled && <div
      data-tour="note-formatting"
      className="flex flex-wrap items-center gap-1"
      onPointerDownCapture={saveSelection}
      onMouseDown={e => {
        // Botões não podem roubar o foco/seleção do contentEditable.
        if ((e.target as HTMLElement).closest('button')) e.preventDefault();
      }}
    >
      <button type="button" aria-label="Negrito" title="Negrito" className="w-9 h-9 rounded-lg border border-black/10 bg-white/75 hover:bg-white flex items-center justify-center font-bold cursor-pointer" onClick={() => command('bold')}><Bold size={18} strokeWidth={2.4}/></button>
      <button type="button" aria-label="Itálico" title="Itálico" className="w-9 h-9 rounded-lg border border-black/10 bg-white/75 hover:bg-white flex items-center justify-center cursor-pointer" onClick={() => command('italic')}><Italic size={18} strokeWidth={2.2}/></button>
      <button type="button" aria-label="Sublinhado" title="Sublinhado" className="w-9 h-9 rounded-lg border border-black/10 bg-white/75 hover:bg-white flex items-center justify-center cursor-pointer" onClick={() => command('underline')}><Underline size={18} strokeWidth={2.2}/></button>
      <select aria-label="Tipografia" title="Tipografia" className="h-9 max-w-[110px] rounded-lg border border-black/10 bg-white/75 px-2 text-[11px]" defaultValue="" onChange={e => { styleSelection('fontFamily', e.target.value); e.currentTarget.value = ''; }}><option value="" disabled>Fonte</option>{fonts.map(f => <option key={f} value={f}>{f}</option>)}</select>
      <select aria-label="Tamanho da fonte" title="Tamanho da fonte" className="h-9 rounded-lg border border-black/10 bg-white/75 px-2 text-[11px]" defaultValue="" onChange={e => { styleSelection('fontSize', `${e.target.value}px`); e.currentTarget.value = ''; }}><option value="" disabled>Tamanho</option>{[12, 14, 16, 18, 20, 24, 28, 32, 36].map(n => <option key={n} value={n}>{n}</option>)}</select>
      <label className="relative w-9 h-9 rounded-lg border border-black/10 bg-white/75 hover:bg-white flex items-center justify-center cursor-pointer" title="Cor do texto" aria-label="Cor do texto"><Palette size={18}/><input type="color" aria-label="Cor do texto" defaultValue="#262626" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => command('foreColor', e.target.value)} /></label>
    </div>}
    <div
      ref={editor}
      contentEditable={!disabled}
      suppressContentEditableWarning
      role="textbox"
      aria-label="Texto da nota"
      aria-multiline="true"
      data-placeholder="Escreva uma reflexão livre, insight de campo, ou ideia..."
      className="w-full flex-1 min-h-[72px] overflow-auto text-xs font-light text-neutral-800 border-none outline-none bg-transparent p-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
      onInput={persist}
      onKeyUp={saveSelection}
      onPointerUp={saveSelection}
      onFocus={saveSelection}
      onBlur={persist}
      onPaste={e => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
        saveSelection();
        persist();
      }}
    />
  </div>;
}
