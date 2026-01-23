// SamplerEngine.js
import { SoundSample } from './SoundSample.js';

export default class SamplerEngine {
    
    // Constructor uses the backend for audio operations
    constructor(backend, opts = {}) {
        this.backend = backend; 
        this.samples = []; 
        this.currentSample = null;

        this.recorder = null;
        this.lastBlob = null;
        this.lastRecordedBuffer = null;
        this.RecordingStream = null;
        this.isRecording = false;

        // GUI and state callbacks
        this.onSampleReady = opts.onSampleReady || (() => {});
        this.onSampleError = opts.onSampleError || (() => {});
        this.onSampleSelect = opts.onSampleSelect || (() => {});
        this.onProgress = opts.onProgress || (() => {});
        this.onStatus = opts.onStatus || (() => {});
        this.onError = opts.onError || (() => {});


        this.onRecordingStart = opts.onRecordingStart || (() => {});
        this.onRecordingStop = opts.onRecordingStop || (() => {});
        this.onNewSampleReady = opts.onNewSampleReady || (() => {});
        this.initMasterEffects();
    }

    // Uses the backend to ensure the audio context is active
    async ensureAudioContextRunning() {
        return await this.backend.ensureRunning();
    }

    // Creates sample objects from file data
    initializeSamples(fileData) {
        this.samples = []; 
        this.currentSample = null;
        
        fileData.forEach(file => {
            if (!file || !file.fullURL) return;
            const sample = new SoundSample(file.name, file.fullURL);
            this.samples.push(sample);
        });
    }

    // Streams and decodes audio via the backend
    async loadAndDecodeSoundStream(url, sample) {
        this.onStatus(sample, { phase: "connect", message: "Connecting…" });

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
                this.onProgress(sample, recv, total);
            }

            const blob = new Blob(chunks, { type: response.headers.get("content-type") || "application/octet-stream" });
            const arrayBuffer = await blob.arrayBuffer();
            
            // Backend handles the specific decoding implementation
            const soundBuffer = await this.backend.decodeAudioData(arrayBuffer);

            this.onStatus(sample, { phase: "ready", message: "Ready" }); 
            return soundBuffer;

        } catch (e) {
            this.onError(sample, e);
            this.onStatus(sample, { phase: "error", message: String(e.message || e) });
            return null;
        }
    }

    // Loads all samples in the current kit
    async loadAllSamples() {
        const loadPromises = this.samples.map(sample => {
            if (!sample.url) return Promise.resolve();
            
            return this.loadAndDecodeSoundStream(sample.url, sample)
                .then(soundData => {
                    if (soundData) {
                        sample.buffer = soundData;
                        this.onSampleReady(sample);
                    }
                });
        });

        await Promise.all(loadPromises);

        if (!this.currentSample) {
            const firstSample = this.samples.find(s => s.buffer);
            if (firstSample) this.selectSample(firstSample);
        }
    }

    // Plays a sample using the utility and backend context
   playSample(sample) {
    if (!sample || !sample.buffer) return;
    const ctx = this.backend.ctx;
    const source = ctx.createBufferSource();
    source.buffer = sample.buffer;
    
    if (this.masterInput) {
            source.connect(this.masterInput);
        } else {
            source.connect(ctx.destination);
        }
        
        const duration = sample.trimEnd - sample.trimStart;
        source.start(0, sample.trimStart, duration);
    }

    // Selects a sample for the UI editor
    selectSample(sample) {
        if (this.currentSample === sample) return;
        this.currentSample = sample;
        this.onSampleSelect(sample);
    }

    // Recording logic

    async initrecorder() {
        if (this.recorder) return true;

        try {
            this.RecordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recorder = new MediaRecorder(this.RecordingStream);
            this.recorder.addEventListener('dataavailable', this.onRecordingReady.bind(this));
            return true;
        } catch (e) {
            this.onError(null, e);
            return false;
        }
    }

    startRecording() {
        if (!this.recorder || this.recorder.state === 'recording') return;
        this.lastBlob = null;
        this.lastRecordedBuffer = null;
        this.recorder.start();
        this.isRecording = true;
        this.onRecordingStart();
    }

    stopRecording() {
        if (!this.recorder || this.recorder.state !== 'recording') return;
        this.recorder.stop();
        this.isRecording = false;
        this.onRecordingStop();
    }

    async onRecordingReady(event) {
        this.lastBlob = event.data;
        if (!this.lastBlob || this.lastBlob.size === 0) return;

        this.onStatus(null, { phase: "decoding", message: "Decoding recorded audio…" });
        
        try {
            const arrayBuffer = await this.lastBlob.arrayBuffer();
            this.lastRecordedBuffer = await this.backend.decodeAudioData(arrayBuffer);
            this.onStatus(null, { phase: "ready", message: "Recorded audio ready" });
            this.onNewSampleReady();
        } catch (e) {
            this.onError(null, e);
        }   
    }

    addRecordedSample(samplerName = "Custom Rec") {
        if (!this.lastRecordedBuffer) return false;

        const newSample = new SoundSample(samplerName, null);
        newSample.buffer = this.lastRecordedBuffer;
        newSample.trimStart = 0;
        newSample.trimEnd = this.lastRecordedBuffer.duration;

        const padIndex = this.samples.findIndex(s => !s.buffer);
        const MAX_PADS = 16;

        if (padIndex !== -1) {
            this.samples[padIndex] = newSample;
        } else if (this.samples.length < MAX_PADS) {
            this.samples.push(newSample);
        } else {
            const targetIndex = this.currentSample ? this.samples.findIndex(s => s === this.currentSample) : this.samples.length - 1;
            this.samples[targetIndex] = newSample;
        }

        this.onSampleReady(newSample);
        this.selectSample(newSample);
        return true;
    }

  

    getCurrentSample() {
        return this.currentSample;
    }

    getSamples() {
        return this.samples;
    }

    initMasterEffects() {
    const ctx = this.backend.ctx;
    this.filters = [];
    
    [60, 170, 350, 1000, 3500, 10000].forEach((freq) => {
        const eq = ctx.createBiquadFilter();
        eq.frequency.value = freq;
        eq.type = "peaking"; //
        eq.gain.value = 0;
        this.filters.push(eq);
    });

   
    for(let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i+1]);
    }

    // 3. Master Gain & Panner
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;
    this.stereoPanner = ctx.createStereoPanner();
    
    // 4. Analyser for Vizualization
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512; //
    
    this.filters[this.filters.length - 1].connect(this.masterGain);
    this.masterGain.connect(this.stereoPanner);
    this.stereoPanner.connect(this.analyser);
    this.analyser.connect(ctx.destination);
    
    this.masterInput = this.filters[0];
}
}