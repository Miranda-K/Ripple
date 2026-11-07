// Minimal Web Speech API wrapper with feature detection (Chrome/Edge/Safari).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

function getCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = (): boolean => getCtor() !== null;

export interface SpeechSession {
  stop: () => void;
}

export function startDictation(handlers: { onText: (finalText: string, interim: string) => void; onError: (msg: string) => void; onEnd: () => void }): SpeechSession | null {
  const C = getCtor();
  if (!C) return null;
  const rec = new C();
  rec.lang = 'en-CA';
  rec.continuous = true;
  rec.interimResults = true;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += `${r[0].transcript.trim()} `;
      else interim += r[0].transcript;
    }
    handlers.onText(finalText.trim(), interim);
  };
  rec.onerror = (e) => handlers.onError(e.error === 'not-allowed' ? 'Microphone permission was denied. You can type the note instead.' : `Speech recognition error: ${e.error}`);
  rec.onend = () => handlers.onEnd();
  try {
    rec.start();
  } catch {
    handlers.onError('Could not start speech recognition. You can type the note instead.');
    return null;
  }
  return { stop: () => rec.stop() };
}
