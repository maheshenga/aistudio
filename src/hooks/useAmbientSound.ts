// Global ambient sound controller
export type AmbientSoundType = 'none' | 'coffee' | 'rain' | 'whitenoise';

class AmbientAudioController {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private _activeSound: AmbientSoundType = 'none';
  private _volume: number = 0.5;
  private listeners: Set<() => void> = new Set();
  
  get activeSound() { return this._activeSound; }
  get volume() { return this._volume; }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  setVolume(v: number) {
    this._volume = v;
    if (this.gainNode) {
      this.gainNode.gain.value = v;
    }
    this.notify();
  }

  async setActiveSound(type: AmbientSoundType) {
    this._activeSound = type;
    this.stop();
    if (type !== 'none') {
      await this.play(type);
    }
    this.notify();
  }

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = this._volume;
    }
    return { ctx: this.ctx, gain: this.gainNode! };
  }

  private generateNoise(ctx: AudioContext, type: 'white' | 'pink'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    } else {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11;
          b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  private async play(type: AmbientSoundType) {
    const { ctx, gain } = this.getContext();
    if (ctx.state === 'suspended') await ctx.resume();
    
    this.source = ctx.createBufferSource();
    this.source.loop = true;

    if (type === 'whitenoise') {
      this.source.buffer = this.generateNoise(ctx, 'white');
      this.source.connect(gain);
    } else if (type === 'rain') {
      this.source.buffer = this.generateNoise(ctx, 'pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      this.source.connect(filter);
      filter.connect(gain);
    } else if (type === 'coffee') {
      this.source.buffer = this.generateNoise(ctx, 'pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 600;
      filter.Q.value = 0.5;
      this.source.connect(filter);
      filter.connect(gain);
    }
    this.source.start();
  }

  private stop() {
    if (this.source) {
      try { this.source.stop(); } catch(e){}
      this.source.disconnect();
      this.source = null;
    }
  }
}

export const ambientAudio = new AmbientAudioController();

import { useState, useEffect } from 'react';
export function useAmbientSound() {
  const [activeSound, setActiveSoundState] = useState(ambientAudio.activeSound);
  const [volume, setVolumeState] = useState(ambientAudio.volume);

  useEffect(() => {
    return ambientAudio.subscribe(() => {
      setActiveSoundState(ambientAudio.activeSound);
      setVolumeState(ambientAudio.volume);
    });
  }, []);

  return {
    activeSound,
    setActiveSound: (type: AmbientSoundType) => ambientAudio.setActiveSound(type),
    volume,
    setVolume: (v: number) => ambientAudio.setVolume(v)
  };
}
