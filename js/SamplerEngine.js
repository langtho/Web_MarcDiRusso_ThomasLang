// SamplerEngine.js

import { playSound } from './Engine/soundutils.js';
import { SoundSample } from './Engine/SoundSample.js';

export default class SamplerEngine {
    
    constructor(opts = {}) {
        this.ctx = opts.audioContext || new AudioContext();
        this.samples = []; 
        this.currentSample = null;

        
        this.onSampleReady = opts.onSampleReady || (() => {});
        this.onSampleError = opts.onSampleError || (() => {});
        this.onSampleSelect = opts.onSampleSelect || (() => {});

        this.onProgress = opts.onProgress || (() => {});
        this.onStatus= opts.onStatus || (() => {});
        this.onError= opts.onError || (() => {});
    }

    async ensureAudioContextRunning() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        return this.ctx;
    }


    initializeSamples(fileData) {
        this.samples = [];
        this.currentSample = null;
        
        fileData.forEach(file => {
            if (!file || !file.fullURL) {
                console.warn("Skipping sample due to incomplete data:", file);
                return;
            }
            const sampleName = file.name// || file.fullURL.split('/').pop();
            const sample = new SoundSample(sampleName, file.fullURL);
            this.samples.push(sample);
        });
    }

    
    // soundutils.js (Ersetze die alte loadAndDecodeSound-Funktion)


 async  loadAndDecodeSoundStream(url, ctx, sample, onProgress, onStatus, onError) {
    onStatus(sample, { phase: "connect", message: "Connecting…" });

    try {
        const response = await fetch(url);
        if (!response.ok || !response.body) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const total = Number(response.headers.get("content-length") || 0) || null;
        
        const reader = response.body.getReader(); 
        const chunks = [];
        let recv = 0;

        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            recv += value.length;
           
            onProgress(sample, recv, total); 
        }

        
        const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
        const soundBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());

        onStatus(sample, { phase: "ready", message: "Ready" }); 
        
        return soundBuffer;

    } catch (e) {
        onError(sample, e);
        onStatus(sample, { phase: "error", message: String(e.message || e) });
        return null; 
    }
}



    async loadAllSamples() {
     
        const loadPromises = this.samples.map(sample => {
            if (!sample.url) return Promise.resolve();
            
            return this.loadAndDecodeSoundStream(
            sample.url, 
            this.ctx, 
            sample, 
            this.onProgress,
            this.onStatus,   
            this.onError     
        ).then(soundData => {
            if (soundData) {
                sample.buffer = soundData;
                this.onSampleReady(sample);
            }
        });
        });

        await Promise.all(loadPromises);

        if (!this.currentSample) {
            const firstSample = this.samples.find(s => s.buffer);
            if (firstSample) {
                this.selectSample(firstSample);
            }
        }
    }

    playSample(sample) {
        if (!sample || !sample.buffer) return;
        playSound(this.ctx, sample.buffer, sample.trimStart, sample.trimEnd);
    }

    selectSample(sample) {
        if (this.currentSample === sample) return;
        
        this.currentSample = sample;
        this.onSampleSelect(sample); 
    }

    forceUpdateCurrentSample() {
        if (this.currentSample) {
            this.onSampleSelect(this.currentSample); 
        }
    }
    
    // --- Getters ---
    getCurrentSample() {
        return this.currentSample;
    }

    getSamples() {
        return this.samples;
    }

 
}