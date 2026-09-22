import React, { useEffect, useRef } from 'react';

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
  const lastSaved = useRef("__initial__");
  useEffect(() => {
    if (editor.current && content !== lastSaved.current && document.activeElement !== editor.current) {
      if (/^<(?:b|strong|i|em|u|span|div|p|br|font)(?:\s|>|\/)/i.test(content)) editor.current.innerHTML = clean(content);
      else editor.current.textContent = content;
      lastSaved.current = content;
    }
  }, [content]);
  const saveSelection = () => {
    const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
    if (range && editor.current?.contains(range.commonAncestorContainer)) selection.current = range.cloneRange();
  };
  const restore = () => {
    editor.current?.focus();
    if (selection.current) { const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(selection.current); }
  };
  const persist = () => {
    if (!editor.current) return;
    const value = clean(editor.current.innerHTML);
    lastSaved.current = value;
    onChange(value);
    saveSelection();
  };
  const command = (name: string, value?: string) => { restore(); document.execCommand(name, false, value); persist(); };
  const styleSelection = (property: 'fontFamily' | 'fontSize', value: string) => {
    restore();
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
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
    sel.removeAllRanges(); sel.addRange(range);
    persist();
  };
  return <div className="flex flex-1 min-h-0 flex-col gap-1" onPointerDown={e => e.stopPropagation()}>
    {!disabled && <div className="flex flex-wrap items-center gap-1" onMouseDown={e => { if ((e.target as HTMLElement).closest('button')) e.preventDefault(); }}>
      <button type="button" aria-label="Negrito" title="Negrito" className="px-1 font-bold" onClick={() => command('bold')}>B</button>
      <button type="button" aria-label="Itálico" title="Itálico" className="px-1 italic" onClick={() => command('italic')}>I</button>
      <button type="button" aria-label="Sublinhado" title="Sublinhado" className="px-1 underline" onClick={() => command('underline')}>U</button>
      <select aria-label="Tipografia" title="Tipografia" className="max-w-[95px] bg-transparent text-[10px]" defaultValue="" onPointerDown={saveSelection} onChange={e => styleSelection('fontFamily', e.target.value)}><option value="" disabled>Fonte</option>{fonts.map(f => <option key={f} value={f}>{f}</option>)}</select>
      <select aria-label="Tamanho da fonte" title="Tamanho da fonte" className="bg-transparent text-[10px]" defaultValue="" onPointerDown={saveSelection} onChange={e => styleSelection('fontSize', `${e.target.value}px`)}><option value="" disabled>Tamanho</option>{[12, 14, 16, 18, 20, 24, 28, 32, 36].map(n => <option key={n} value={n}>{n}</option>)}</select>
      <input type="color" aria-label="Cor do texto" title="Cor do texto" defaultValue="#262626" className="h-5 w-6 cursor-pointer" onPointerDown={saveSelection} onChange={e => command('foreColor', e.target.value)} />
    </div>}
    <div ref={editor} contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label="Texto da nota" aria-multiline="true" data-placeholder="Escreva uma reflexão livre, insight de campo, ou ideia..." className="w-full flex-1 min-h-[72px] overflow-auto text-xs font-light text-neutral-800 border-none outline-none bg-transparent p-0 whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400" onInput={persist} onKeyUp={saveSelection} onMouseUp={saveSelection} onBlur={persist} onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }} />
  </div>;
}

