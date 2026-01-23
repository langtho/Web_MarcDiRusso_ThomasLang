import SamplerEngine from './Engine/SamplerEngine.js';
import SamplerGUI from './GUI/SamplerGUI.js';
import { WebAudioBackend } from './Engine/AudioBackend.js';

class SamplerBeatpad extends HTMLElement {
    constructor() {
        super();
        this.samplerGUI = null;
        this.samplerEngine = null;
    }

    async connectedCallback() {
        // Render the HTML structure directly into the element (Light DOM)
        this.innerHTML = `
            <div id="app-container">
                <button id="menu-toggle" class="btn"><i class="fa-solid fa-bars"></i></button>
                <header>
                    <h1 id="app-title">Beatpad — Loading...</h1>
                    <div id="controls-container">
                        <label for="presetSelect">Select Kit:</label>
                        <select id="presetSelect"></select>
                        <button id="loadKitButton" class="btn">Load Kit</button> 
                        <button id="clearKitButton" class="btn"><i class="fa-solid fa-eraser"></i> New Custom Kit</button>
                        <button id="saveKitButton" class="btn primary">Save Kit</button>
                    </div>
                </header>
                <aside id="sidebar" class="sidebar">
                    <div class="sidebar-content">
                        <h2>Freesound Search</h2>
                        <div class="search-box">
                            <input type="text" id="fsSearchInput" placeholder="Search sounds...">
                            <button id="fsSearchBtn" class="btn">Search</button>
                        </div>
                        <div id="fsResults" class="results-container"></div>
                    </div>
                </aside>
                <div id="main-layout">
                    <aside id="equalizer-container">
                        <h2>Equalizer</h2>
                        <canvas id="freqCanvasMaster" width="280" height="120"></canvas>
                        <div class="eq-controls">
                            ${[60, 170, 350, 1000, 3500, 10000].map((f, i) => `
                                <div class="controls"><label>${f >= 1000 ? f/1000+'k' : f}Hz</label>
                                <input type="range" min="-30" max="30" value="0" data-filter="${i}" class="eq-slider">
                                <output id="gain${i}">0dB</output></div>
                            `).join('')}
                        </div>
                        <div class="master-section">
                            <div class="controls"><label>Volume</label><input type="range" id="masterVolumeSlider" min="0" max="10" step="0.1" value="10"><output id="masterGainOutput">10</output></div>
                            <div class="controls"><label>Balance</label><input type="range" id="balanceSlider" min="-1" max="1" step="0.1" value="0"><output id="balanceOutput">0</output></div>
                        </div>
                    </aside>
                    <main id="sampler-main">
                        <div class="waveform-box">
                            <div id="waveform-wrapper">
                                <canvas id="freqCanvasEditor" width="600" height="100"></canvas>
                                <canvas id="myCanvas" width="600" height="100"></canvas>
                                <canvas id="myCanvasOverlay" width="600" height="100"></canvas>
                            </div>
                        </div>
                        <div id="buttonContainer"></div>
                        <div class="bottom-controls">
                            <div class="recorder-section">
                                <h2>Recorder</h2>
                                <div class="recorder-row">
                                    <button class="btn" id="recordButton"><i class="fa-solid fa-play"></i></button>
                                    <button class="btn" id="stopButton" disabled><i class="fa-solid fa-stop"></i></button>
                                    <button class="btn" id="playRecordedButton" disabled><i class="fa-solid fa-volume-high"></i></button>
                                    <button class="btn primary" id="addRecordedButton" disabled><i class="fa-solid fa-plus"></i></button>
                                    <span id="recordStatus" style="color: #10b981;">Ready</span>
                                </div>
                            </div>
                            <div class="midi-section">
                                <h2>MIDI</h2>
                                <div class="midi-row">
                                    <button class="btn" id="midiEnableBtn">Activate</button>
                                    <select id="midiInput" disabled><option>(none)</option></select>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        `;

        this.initSampler();
    }

    async initSampler() {
        const config = {
            apiUrl: 'http://localhost:3000/api/presets',
            audioBasePath: 'http://localhost:3000/presets/',
            fsApiKey: "SF19OkX8syIplOcKsjGQggpGHoXr0rg0E9CteBZG"
        };

        const opts = {
            canvas: this.querySelector('#myCanvas'),
            canvasOverlay: this.querySelector('#myCanvasOverlay'),
            $buttoncontainer: this.querySelector('#buttonContainer'),
            $presetSelect: this.querySelector('#presetSelect'),
            $loadKitButton: this.querySelector('#loadKitButton'),
            $appTitle: this.querySelector('#app-title'),
            $recordButton: this.querySelector('#recordButton'),
            $stopButton: this.querySelector('#stopButton'),
            $playRecordedButton: this.querySelector('#playRecordedButton'),
            $addRecordedButton: this.querySelector('#addRecordedButton'),
            $recordStatus: this.querySelector('#recordStatus')
        };

        const backend = new WebAudioBackend();
        this.samplerEngine = new SamplerEngine(backend);
        this.samplerGUI = new SamplerGUI(this.samplerEngine, opts, config);

        // Resume audio on first interaction
        this.addEventListener('click', () => {
            this.samplerEngine.ensureAudioContextRunning();
        }, { once: true });

        await this.samplerGUI.fetchPresets();

        opts.$loadKitButton.addEventListener('click', () => {
            this.samplerGUI.handlePresetSelection(this.samplerEngine);
        });
    }
}

// Define the custom tag
customElements.define('sampler-beatpad', SamplerBeatpad);