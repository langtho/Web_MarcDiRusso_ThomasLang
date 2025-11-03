// WaveformEditor.js

import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { pixelToSeconds ,secondsToPixel} from '../Engine/utils.js';

export default class WaveformEditor {
    constructor(canvas, canvasOverlay, playCallback) {
        this.canvas = canvas;
        this.canvasOverlay = canvasOverlay;
        this.playCallback = playCallback; 
        this.currentSample = null;
        this.mousePos = { x: 0, y: 0 };
        
        this.waveformDrawer = new WaveformDrawer();
        this.trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 100, 200);

        this.setupTrimbarsEventListeners();
        this.startAnimationLoop();
    }


    selectSample(sample) {
        
        if (this.currentSample) {
            this.currentSample.trimStart = pixelToSeconds(this.trimbarsDrawer.leftTrimBar.x, 1, this.canvas.width);
            this.currentSample.trimEnd = pixelToSeconds(this.trimbarsDrawer.rightTrimBar.x, 1, this.canvas.width);
        }
        
      
        this.currentSample = sample;

        if (!this.currentSample || !this.currentSample.buffer) return;
        
        console.log("WaveformEditor: Displaying sample:", this.currentSample.name);

       
        this.trimbarsDrawer.leftTrimBar.x = secondsToPixel(this.currentSample.trimStart, 1, this.canvas.width);
        this.trimbarsDrawer.rightTrimBar.x = secondsToPixel(this.currentSample.trimEnd, 1, this.canvas.width);
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
           
            if (this.currentSample && this.trimbarsDrawer.isDragging) {
                // Update trim values (in seconds) in the SoundSample instance
                this.currentSample.trimStart = pixelToSeconds(this.trimbarsDrawer.leftTrimBar.x, 1, CANVAS_WIDTH);
                this.currentSample.trimEnd = pixelToSeconds(this.trimbarsDrawer.rightTrimBar.x, 1, CANVAS_WIDTH);
            }
        }

        this.canvasOverlay.onmousedown = () => this.trimbarsDrawer.startDrag();

        this.canvasOverlay.onmouseup = () => {
            const wasDragging = this.trimbarsDrawer.isDragging; 
            this.trimbarsDrawer.stopDrag();
            
            if (wasDragging && this.currentSample) {
                this.playCallback(this.currentSample);
            }
        }
    }

    // Corresponds to your old animate function
    startAnimationLoop() {
        const animate = () => {
            this.trimbarsDrawer.clear();
            this.trimbarsDrawer.draw();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    // Public getter for the current sample
    getCurrentSample() {
        return this.currentSample;
    }
}