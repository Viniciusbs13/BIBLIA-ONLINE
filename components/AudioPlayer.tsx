
import React, { useState, useEffect } from 'react';
import { generateAudioSpeech } from '../services/geminiService';

interface AudioPlayerProps {
  text: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ text }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);
  const [audioContext] = useState(() => new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }));

  const decodeAudio = async (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = audioContext.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const handlePlay = async () => {
    if (isPlaying) {
      audioSource?.stop();
      setIsPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const base64 = await generateAudioSpeech(text);
      const buffer = await decodeAudio(base64);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
      setAudioSource(source);
      setIsPlaying(true);
    } catch (error) {
      console.error("Audio error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all shadow-lg active:scale-95 disabled:opacity-50"
    >
      {loading ? (
        <span className="animate-pulse">Preparando áudio...</span>
      ) : isPlaying ? (
        <>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <span>Pausar Áudio</span>
        </>
      ) : (
        <>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <span>Ouvir Capítulo</span>
        </>
      )}
    </button>
  );
};

export default AudioPlayer;
