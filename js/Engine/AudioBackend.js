export class AudioBackend {
    async ensureRunning() {
        throw new Error("ensureRunning() not implemented");
    }

    async decodeAudioData(arrayBuffer) {
        throw new Error("decodeAudioData() not implemented");
    }

    createBufferSource() {
        throw new Error("createBufferSource() not implemented");
    }

    getDestination() {
        throw new Error("getDestination() not implemented");
    }
}

// Browser implementation using Web Audio API
export class WebAudioBackend extends AudioBackend {
    constructor(audioContext) {
        super();
        this.ctx = audioContext || new AudioContext();
    }

    async ensureRunning() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
        return this.ctx;
    }

    async decodeAudioData(arrayBuffer) {
        return await this.ctx.decodeAudioData(arrayBuffer);
    }

    createBufferSource() {
        return this.ctx.createBufferSource();
    }

    getDestination() {
        return this.ctx.destination;
    }

    get sampleRate() {
        return this.ctx.sampleRate;
    }
}

// AudioBackend.js

export class HeadlessAudioBackend extends AudioBackend {
    constructor() {
        super();
        this.sampleRate = 44100;
        
        // Sicherer Check für OfflineAudioContext
        const ContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        
        if (ContextClass) {
            // Wir erstellen einen minimalen Kontext (2 Kanäle, 1 Sample lang)
            this.ctx = new ContextClass(2, 1, this.sampleRate);
        } else {
            // Fallback für Umgebungen ohne Web Audio Support
            console.warn("HeadlessAudioBackend: Web Audio API not found. Using Mock Context.");
            this.ctx = this._createMockContext();
        }
    }

    _createMockContext() {
        return {
            createBiquadFilter: () => ({
                frequency: { value: 0 },
                type: "",
                gain: { value: 0 },
                connect: () => {}
            }),
            destination: { connect: () => {} },
            decodeAudioData: async (buf) => ({
                duration: 1,
                length: 44100,
                numberOfChannels: 2,
                sampleRate: 44100,
                getChannelData: () => new Float32Array(100)
            })
        };
    }

    async ensureRunning() {
        return this;
    }

    async decodeAudioData(arrayBuffer) {
        // Nutze den echten Kontext, wenn vorhanden, sonst den Mock
        try {
            return await this.ctx.decodeAudioData(arrayBuffer);
        } catch (e) {
            return this._createMockContext().decodeAudioData();
        }
    }

    createBufferSource() {
        return { 
            connect: () => {}, 
            start: () => {}, 
            stop: () => {},
            buffer: null,
            playbackRate: { value: 1 }
        };
    }

    getDestination() {
        return this.ctx.destination || { connect: () => {} };
    }
}