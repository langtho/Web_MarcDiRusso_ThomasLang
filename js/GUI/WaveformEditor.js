import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { pixelToSeconds, secondsToPixel } from '../Engine/utils.js';

export default class WaveformEditor {
    constructor(canvas, canvasOverlay, freqCanvas, playCallback) {
        this.canvas = canvas;
        this.canvasOverlay = canvasOverlay;
        this.freqCanvas = freqCanvas; 
        this.freqCtx = freqCanvas ? freqCanvas.getContext('2d') : null;
        this.playCallback = playCallback; 
        this.currentSample = null;
        this.mousePos = { x: 0, y: 0 };
        
        this.waveformDrawer = new WaveformDrawer();
        this.trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 100, 200);

        this.setupTrimbarsEventListeners();
        this.startAnimationLoop();
    }

startFrequencyVisualizer(analyser) {
    if (!this.freqCtx || !analyser) return;

    const width = this.freqCanvas.width;
    const height = this.freqCanvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
        requestAnimationFrame(draw);
        this.freqCtx.save();
        this.freqCtx.fillStyle = "rgba(0, 0, 0, 0.05)"; 
        this.freqCtx.fillRect(0, 0, width, height);

        analyser.getByteFrequencyData(dataArray);
        const HALF_HEIGHT = height / 2;
        const numBars = 1.7 * Math.round(width / 5);

        for (let i = 0; i < numBars; ++i) {
            const magnitude = 0.3 * dataArray[Math.round((i * bufferLength) / numBars)];
            this.freqCtx.fillStyle = `hsl(${Math.round((i * 360) / numBars)}, 100%, 50%)`;
            this.freqCtx.fillRect(i * 5, HALF_HEIGHT, 2, -magnitude);
            this.freqCtx.fillRect(i * 5, HALF_HEIGHT, 2, magnitude);
        }
        this.freqCtx.restore();
    };
    draw();
}

   selectSample(sample) {
    const CANVAS_WIDTH = this.canvas.width;
    
    this.currentSample = sample;
    
    if (!this.currentSample || !this.currentSample.buffer) return;
    
    const duration = this.currentSample.buffer.duration;

    this.currentSample.trimStart = 0;
    this.currentSample.trimEnd = duration;

    this.trimbarsDrawer.leftTrimBar.x = 0;
    this.trimbarsDrawer.rightTrimBar.x = CANVAS_WIDTH;
    
    this.waveformDrawer.init(this.currentSample.buffer, this.canvas, '#83E83E');
    this.waveformDrawer.drawWave(0, this.canvas.height);
    
    this.playCallback(this.currentSample);
}

    setupTrimbarsEventListeners() {
        const CANVAS_WIDTH = this.canvas.width;
        this.canvasOverlay.onmousemove = (evt) => {
            let rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = (evt.clientX - rect.left);
            this.mousePos.y = (evt.clientY - rect.top);
            this.trimbarsDrawer.moveTrimBars(this.mousePos);
           
            if (this.currentSample && this.trimbarsDrawer.isDragging && this.currentSample.buffer) {
                const duration = this.currentSample.buffer.duration;
                this.currentSample.trimStart = pixelToSeconds(this.trimbarsDrawer.leftTrimBar.x, duration, CANVAS_WIDTH);
                this.currentSample.trimEnd = pixelToSeconds(this.trimbarsDrawer.rightTrimBar.x, duration, CANVAS_WIDTH);
            }
        }
        this.canvasOverlay.onmousedown = () => this.trimbarsDrawer.startDrag();
        this.canvasOverlay.onmouseup = () => {
            const wasDragging = this.trimbarsDrawer.isDragging; 
            this.trimbarsDrawer.stopDrag();
            if (wasDragging && this.currentSample) this.playCallback(this.currentSample);
        }
    }

    startAnimationLoop() {
        const animate = () => {
            this.trimbarsDrawer.clear();
            this.trimbarsDrawer.draw();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    getCurrentSample() { return this.currentSample; }
}