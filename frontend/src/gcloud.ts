import cfg from './config';

const GCLOUD_API_KEY = cfg.gcloudKey;

export function assertGcloudKey(): void {
  if (!GCLOUD_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('VITE_GCLOUD_API_KEY is not set. Google API calls will fail.');
  }
}

type SynthesizeOptions = {
  text: string;
  languageCode?: string;
  voiceName?: string;
  audioEncoding?: 'MP3' | 'OGG_OPUS' | 'LINEAR16';
};

export async function synthesizeSpeech(options: SynthesizeOptions): Promise<any> {
  const key = GCLOUD_API_KEY;
  if (!key) {
    throw new Error('Missing VITE_GCLOUD_API_KEY');
  }
  const {
    text,
    languageCode = 'en-US',
    voiceName,
    audioEncoding = 'MP3',
  } = options;

  const url = `${cfg.ttsBase}/text:synthesize?key=${encodeURIComponent(key)}`;
  const body = {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig: { audioEncoding },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: cfg.headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'TTS request failed');
  }
  return res.json();
}

export { GCLOUD_API_KEY };

