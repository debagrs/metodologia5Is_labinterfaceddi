import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';

interface Props {
  onText: (text: string) => void;
  locale?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}

export default function VoiceDictationButton({ onText, locale = 'pt-BR', disabled = false, className = '', title = 'Ditar por voz' }: Props) {
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    try { recognitionRef.current?.stop?.(); } catch {}
  }, []);

  const stop = () => {
    try { recognitionRef.current?.stop?.(); } catch {}
    setListening(false);
  };

  const start = () => {
    if (disabled) return;
    setError('');
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      setError('Ditado por voz não disponível neste navegador.');
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = locale;
      recognition.continuous = true;
      recognition.interimResults = true;
      let finalBuffer = '';
      recognition.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const value = String(event.results[i]?.[0]?.transcript || '');
          if (event.results[i]?.isFinal) finalText += `${value} `;
        }
        if (finalText.trim()) {
          finalBuffer += finalText;
          onText(finalText.trim());
        }
      };
      recognition.onerror = (event: any) => {
        setError(event?.error === 'not-allowed' ? 'Permita o microfone para usar voz.' : `Falha no ditado (${event?.error || 'erro'}).`);
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (cause: any) {
      setError(cause?.message || 'Não foi possível iniciar o microfone.');
    }
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={listening ? stop : start}
        title={listening ? 'Parar ditado' : title}
        aria-label={listening ? 'Parar ditado por voz' : title}
        className={`h-11 w-11 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-40 ${listening ? 'border-red-600 bg-red-50 text-red-700 animate-pulse' : 'border-black bg-white text-black hover:bg-black/5'}`}
      >
        {listening ? <Square size={16} /> : <Mic size={18} />}
      </button>
      {error && (
        <span className="absolute bottom-full right-0 mb-2 w-52 rounded-xl border border-red-200 bg-red-50 p-2 text-[9px] leading-snug text-red-700 shadow-lg z-50">
          <AlertCircle size={11} className="inline mr-1" />{error}
        </span>
      )}
    </span>
  );
}
