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

// Headless/Node.js stub implementation
export class HeadlessAudioBackend extends AudioBackend {
    constructor() {
        super();
        this.sampleRate = 44100;
        this.buffers = new Map();
    }

    async ensureRunning() {
        return this;
    }

    async decodeAudioData(arrayBuffer) {
        const bufferId = Math.random().toString(36);
        this.buffers.set(bufferId, arrayBuffer);
        return {
            duration: arrayBuffer.byteLength / (this.sampleRate * 2),
            length: arrayBuffer.byteLength,
            numberOfChannels: 2,
            sampleRate: this.sampleRate,
            __headlessId: bufferId
        };
    }

    createBufferSource() {
        return { connect: () => {}, start: () => {}, stop: () => {} };
    }

    getDestination() {
        return { connect: () => {} };
    }
}