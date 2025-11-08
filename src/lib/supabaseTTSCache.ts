import { supabase, isSupabaseEnabled } from '@/lib/supabase';

const STORAGE_BUCKET = 'tts-audio';

async function computeContentHash(modelName: string, voiceIdentifier: string, text: string): Promise<string> {
  const content = `${modelName}:${voiceIdentifier}:${text}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(content);

  if (typeof window === 'undefined') {
    const cryptoModule = await import('crypto');
    return cryptoModule.createHash('sha256').update(data).digest('hex');
  }

  if (!crypto?.subtle) {
    // Fallback: simple hash (not cryptographically strong but deterministic)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(16);
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function checkSupabaseTTSCache(
  modelName: string,
  text: string,
  voiceIdentifier: string
): Promise<string | null> {
  if (!isSupabaseEnabled() || !supabase) {
    return null;
  }

  try {
    const hash = await computeContentHash(modelName, voiceIdentifier, text);
    const { data, error } = await supabase
      .from('tts_audio')
      .select('file_path')
      .eq('content_hash', hash)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase TTS cache lookup error:', error);
      return null;
    }

    if (!data?.file_path) {
      return null;
    }

    const { error: rpcError } = await supabase
      .rpc('increment_tts_access', { hash });

    if (rpcError) {
      console.warn('Supabase increment RPC failed:', rpcError.message || rpcError);
    }

    const { data: publicUrlData } = supabase
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.file_path);

    return publicUrlData?.publicUrl ?? null;
  } catch (err) {
    console.error('Supabase TTS cache check failed:', err);
    return null;
  }
}

export async function saveToSupabaseTTS(
  modelName: string,
  text: string,
  voiceIdentifier: string,
  audioBlob: Blob
): Promise<void> {
  if (!isSupabaseEnabled() || !supabase) {
    return;
  }

  try {
    const hash = await computeContentHash(modelName, voiceIdentifier, text);
    const filePath = `${hash}.mp3`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
        cacheControl: '31536000',
      });

    if (uploadError) {
      throw uploadError;
    }

    const textPreview = text.length > 100 ? `${text.substring(0, 100)}…` : text;

    const { error: upsertError } = await supabase
      .from('tts_audio')
      .upsert(
        {
          content_hash: hash,
          model_name: modelName,
          voice_id: voiceIdentifier,
          text_preview: textPreview,
          file_path: filePath,
          file_size: audioBlob.size,
        },
        { onConflict: 'content_hash' }
      );

    if (upsertError) {
      throw upsertError;
    }
  } catch (err) {
    console.error('Supabase TTS cache save failed:', err);
  }
}
