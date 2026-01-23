// SamplerGUI.js
import WaveformEditor from './WaveformEditor.js';
import FreesoundService from '../Engine/FreesoundService.js';
import { SoundSample } from '../Engine/SoundSample.js';

let allPresetsData = [];

export default class SamplerGUI {
    
    constructor(engine, opts, config) {
        this.engine = engine; 
        this.config = config; 

        // UI elements
        this.$buttoncontainer = opts.$buttoncontainer;
        this.$presetSelect = opts.$presetSelect;
        this.$appTitle = opts.$appTitle;
        
        // Custom kit controls
        this.$clearKitButton = document.querySelector("#clearKitButton");
        this.$saveKitButton = document.querySelector("#saveKitButton");
        this.currentPreview = null;
        this.currentKit = null;

        // MIDI elements
        this.$midiEnableBtn = document.querySelector("#midiEnableBtn");
        this.$midiInputSel = document.querySelector("#midiInput");
        this.$midiStatus = document.querySelector("#midiStatus");

        // Recording elements
        this.$recordButton = opts.$recordButton;
        this.$stopButton = opts.$stopButton;
        this.$playRecordedButton = opts.$playRecordedButton;
        this.$addRecordedButton = opts.$addRecordedButton;
        this.$recordStatus = opts.$recordStatus;

        // Sidebar and Freesound
        this.$sidebar = document.querySelector("#sidebar");
        this.$menuToggle = document.querySelector("#menu-toggle");
        this.$fsInput = document.querySelector('#fsSearchInput');
        this.$fsBtn = document.querySelector('#fsSearchBtn');
        this.$fsResults = document.querySelector('#fsResults');

        // Event Listeners
        if (this.$menuToggle) {
            this.$menuToggle.onclick = () => this.$sidebar.classList.toggle("open");
        }
        if (this.$clearKitButton) {
            this.$clearKitButton.onclick = () => this.startCustomKit();
        }
        if (this.$saveKitButton) {
            this.$saveKitButton.onclick = () => this.saveKit();
        }

        // State
        this.midiAccess = null;
        this.currenMidiInput = null;
        this.BASE_NOTE = 36; 
        this.padElements = new Map();

        // Components
        this.editor = new WaveformEditor(opts.canvas, opts.canvasOverlay, document.querySelector("#freqCanvasEditor"), this.engine.playSample.bind(this.engine));
        
        this.setupEngineCallbacks();
        this.setupMidiListeners();
        this.setupRecordingListeners();
        this.setupKeyboardListeners();
        this.setupEqualizerListeners();
        if (this.engine.analyser) {
        this.editor.startFrequencyVisualizer(this.engine.analyser);
        this.startMasterVisualizer(this.engine.analyser);
        }
        if (config.fsApiKey) {
            this.setupFreesound(config.fsApiKey);
        }
    }

    // --- Core Logic Methods ---

    startMasterVisualizer(analyser) {
        const canvas = document.querySelector("#freqCanvasMaster");
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#8be9fd'; // Dein Cyan-Akzent
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    }

    startCustomKit() {
        this.engine.initializeSamples([]); 
        this.engine.samples = Array(16).fill(null);
        this.currentKit=null;
        this.renderSampleButtons(this.engine.getSamples());
        
        if (this.$appTitle) {
            this.$appTitle.textContent = "Beatpad — Custom Kit Mode";
        }
        this.editor.selectSample(null);
    }

    async saveKit() {
    let kitName = this.currentKit;
    let isUpdate = !!kitName;

    // If no kit is loaded, ask for a name
    if (!isUpdate) {
        kitName = prompt("Enter a name for your new kit:", "My Custom Kit");
        if (!kitName || kitName.trim() === "") return;
    }

    try {
        this.$saveKitButton.disabled = true;
        this.$saveKitButton.innerHTML = isUpdate ? "Updating..." : "Saving...";

        const samples = this.engine.getSamples();
        const samplesToSave = [];

        for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            if (!s) continue;

            // Upload recording if needed
            if (s.url === null && s.buffer) {
                const uploadedUrl = await this.uploadRecordedSample(s, kitName);
                if (uploadedUrl) s.url = uploadedUrl;
            }
            
            samplesToSave.push({ name: s.name, url: s.url });
        }

        const kitData = {
            name: kitName,
            type: "custom",
            isFactoryPresets: false,
            samples: samplesToSave
        };

        // Determine method and URL based on current state
        const url = isUpdate 
            ? `${this.config.apiUrl}/${encodeURIComponent(this.currentKit)}` 
            : this.config.apiUrl;
        const method = isUpdate ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(kitData)
        });

        if (!response.ok) throw new Error("Server error during save");

        const result = await response.json();
        this.currentKit = result.name; // Sync name in case it changed

        alert(isUpdate ? `Kit "${kitName}" updated!` : `Kit "${kitName}" saved!`);
        await this.fetchPresets(); 

    } catch (error) {
        console.error("Save failed:", error);
        alert("Error while saving/updating kit.");
    } finally {
        this.$saveKitButton.disabled = false;
        this.$saveKitButton.innerHTML = "Save Kit";
    }
}

    async uploadRecordedSample(sample, folderName) {
        const blob = this.engine.lastBlob; // Accesses engine's binary data
        if (!blob) return null;

        const formData = new FormData();
        const fileName = `${sample.name.replace(/\s+/g, '_')}.wav`;
        formData.append("files", blob, fileName);

        // Uses the upload route defined in app.mjs
        const uploadUrl = `http://localhost:3000/api/upload/${encodeURIComponent(folderName)}`;
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            const result = await response.json();
            return result.files[0].url; // Returns server-provided path
        }
        return null;
    }


    setupEngineCallbacks() {
        this.engine.onSampleReady = (sample) => {
            const index = this.engine.getSamples().indexOf(sample);
            const button = document.getElementById(`pad-button-${index}`);
            if (button) {
                const label = button.querySelector('span');
                if (label) label.innerText = sample.name;
                button.classList.remove('loading-pad');
                button.classList.add('ready-pad');
                button.disabled = false;
                const els = this.padElements.get(sample.name);
                if (els && els.bar) els.bar.style.width = '100%';
            }
        };

        this.engine.onSampleSelect = (sample) => { this.editor.selectSample(sample); };
        
        this.engine.onProgress = (sample, received, total) => {
            const els = this.padElements.get(sample.name);
            if (!els || !els.bar) return;
            let pct = (total && total > 0) 
                ? Math.max(0, Math.min(100, Math.floor((received / total) * 100)))
                : Math.min(95, Math.floor(Math.log10((received || 0) * 25)));
            els.bar.style.width = `${Math.max(1, pct)}%`;
        };

        this.engine.onRecordingStart = () => {
            this.setRecordControlsState(true, false);
            this.$recordStatus.textContent = "• RECORDING";
            this.$recordStatus.classList.add('recording-active');
            this.$recordButton.classList.add('is-recording');
        };

        this.engine.onRecordingStop = () => {
            this.setRecordControlsState(false, false);
            this.$recordStatus.classList.remove('recording-active');
            this.$recordButton.classList.remove('is-recording');
        };
        this.engine.onNewSampleReady = () => {
            this.setRecordControlsState(false, true);
            this.$recordStatus.textContent = "Recording Ready! Drag me to a pad.";
            this.$recordStatus.draggable = true;
            this.$recordStatus.style.cursor = "grab";
            this.$recordStatus.classList.add("draggable-ready");

            this.$recordStatus.ondragstart = (e) => {
                const data = { type: "internal-recording", name: "My Recording" };
                e.dataTransfer.setData('application/json', JSON.stringify(data));
                this.$recordStatus.style.opacity = "0.5";
            };

            this.$recordStatus.ondragend = () => {
                this.$recordStatus.style.opacity = "1";
            };
        };
        this.engine.onStatus = (sample, status) => { if(!sample) this.$recordStatus.textContent = status.message; };
    }

    renderSampleButtons(samples) {
        this.$buttoncontainer.innerHTML = ''; 
        const ROW_SIZE = 4;
        this.padElements = new Map();

        for (let row = 3; row >= 0; row--) {
            for (let col = 0; col < ROW_SIZE; col++) {
                const i = row * ROW_SIZE + col; 
                const sample = samples[i]; 

                const button = document.createElement('button');
                button.dataset.index = i; 
                button.classList.add('sample-pad');

                if (sample) {
                    button.id = `pad-button-${i}`;
                    this._createPadInner(button, sample);
                    if (sample.buffer) {
                        button.classList.add('ready-pad');
                        const els = this.padElements.get(sample.name);
                        if (els && els.bar) els.bar.style.width = '100%';
                    } else {
                        button.classList.add('loading-pad');
                    }
                } else {
                    button.id = `pad-placeholder-${i}`;
                    button.innerText = `Pad ${i + 1}`;
                    button.classList.add('empty-pad');
                }

                button.ondragover = (e) => { e.preventDefault(); button.classList.add('drop-hover'); };
                button.ondragleave = () => button.classList.remove('drop-hover');
                button.ondrop = (e) => this.handlePadDrop(e, i, button);
                this.$buttoncontainer.appendChild(button);
            }
        }

        this.$buttoncontainer.onclick = (event) => {
            const btn = event.target.closest('.sample-pad');
            if (!btn || btn.classList.contains('empty-pad')) return;
            const index = btn.dataset.index;
            const sample = this.engine.getSamples()[index];
            if (sample && sample.buffer) {
                this.engine.selectSample(sample);
                this.engine.playSample(sample);
            }
        };
    }

    _createPadInner(button, sample) {
        const content = document.createElement('div');
        content.className = 'pad-content';
        content.innerHTML = `<span>${sample.name}</span>`;
        button.appendChild(content);
        const prog = document.createElement('div');
        prog.className = 'prog';
        const bar = document.createElement('div');
        bar.className = 'bar';
        prog.appendChild(bar);
        button.appendChild(prog);
        this.padElements.set(sample.name, { button, prog, bar });
    }

  // SamplerGUI.js

async handlePadDrop(e, index, button) {
    e.preventDefault();
    button.classList.remove('drop-hover');
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'));
        const samples = this.engine.getSamples();
        
        // 1. Handle Internal Recording Drop
        if (data.type === "internal-recording") {
            const buffer = this.engine.lastRecordedBuffer;
            if (!buffer) return;

            const name = prompt("Name your recording:", data.name) || "Rec";
            const newSample = new SoundSample(name, null); // URL is null for new recordings
            newSample.buffer = buffer;
            newSample.trimStart = 0;
            newSample.trimEnd = buffer.duration;

            samples[index] = newSample;
            this.renderSampleButtons(samples);
            this.engine.onSampleReady(newSample);
            this.engine.selectSample(newSample);
            
            // Reset status after successful drop
            this.$recordStatus.draggable = false;
            this.$recordStatus.textContent = "Recording added to pad.";
            return;
        }

        // 2. Handle Freesound Drop
        let targetSample = samples[index];
        if (!targetSample) {
            targetSample = new SoundSample(data.name, data.url);
            samples[index] = targetSample;
        } else {
            targetSample.name = data.name;
            targetSample.url = data.url;
        }

        this.renderSampleButtons(samples);
        const buffer = await this.engine.loadAndDecodeSoundStream(data.url, targetSample);
        if (buffer) {
            targetSample.buffer = buffer;
            targetSample.trimEnd = buffer.duration;
            this.engine.onSampleReady(targetSample);
            this.engine.selectSample(targetSample);
        }
    } catch (err) {
        console.error("Drop failed:", err);
    }
}

    setupFreesound(apiKey) {
        this.freesound = new FreesoundService(apiKey);
        if(this.$fsBtn){
        this.$fsBtn.onclick = () => this.handleFreesoundSearch();
        }
    }

    async handleFreesoundSearch() {
        const query = this.$fsInput.value;
        if (!query) return;
        this.$fsResults.innerHTML = "Searching...";
        try {
            const results = await this.freesound.search(query);
            this.renderFreesoundResults(results);
        } catch (e) { this.$fsResults.innerHTML = "Search error"; }
    }

    renderFreesoundResults(results) {
        this.$fsResults.innerHTML = '';
        results.forEach(res => {
            const div = document.createElement('div');
            div.className = 'fs-result-item';
            div.draggable = true;
            const previewUrl = res.previews['preview-hq-mp3'];
            div.innerHTML = `<div class="fs-info"><span class="fs-name">${res.name}</span></div>
                <div class="fs-actions"><button class="fs-preview-btn btn-sm" title="Listen"><i class="fa-solid fa-play"></i></button></div>`;
            div.ondragstart = (e) => {
                const data = { name: res.name, url: previewUrl };
                e.dataTransfer.setData('application/json', JSON.stringify(data));
            };
            div.querySelector('.fs-preview-btn').onclick = (e) => {
                e.stopPropagation();
                if (this.currentPreview) { this.currentPreview.pause(); this.currentPreview = null; }
                this.currentPreview = new Audio(previewUrl);
                this.currentPreview.play();
                const icon = e.currentTarget.querySelector('i');
                icon.classList.replace('fa-play', 'fa-volume-high');
                this.currentPreview.onended = () => icon.classList.replace('fa-volume-high', 'fa-play');
            };
            this.$fsResults.appendChild(div);
        });
    }

    async fetchPresets() {
        try {
            const response = await fetch(this.config.apiUrl);
            if (!response.ok) throw new Error("Fetch error");
            allPresetsData = await response.json();
            if (this.$appTitle) this.$appTitle.textContent = "Beatpad — Kits Loaded"; 
            this.$presetSelect.innerHTML = '<option value="">-- Select a preset kit --</option>';
            allPresetsData.forEach((pre, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.textContent = pre.name;
                this.$presetSelect.appendChild(opt);
            });
        } catch (e) { 
            console.error("Presets error", e); 
            if (this.$appTitle) this.$appTitle.textContent = "Beatpad — Error";
        }
    }

    async handlePresetSelection(samplerEngine) {
        const selectedIndex = this.$presetSelect.value;
        if (selectedIndex === '' || !allPresetsData[selectedIndex]) return;
        const selectedPreset = allPresetsData[selectedIndex];
        this.currentKit = selectedPreset.name;
        if (this.$appTitle) this.$appTitle.textContent = `Beatpad — Kit: ${selectedPreset.name}`;
        const sampleData = selectedPreset.samples.map(file => ({
            name: file.name,
            fullURL: new URL(file.url.replace(/^\.\//, ''), this.config.audioBasePath).toString()
        }));
        samplerEngine.initializeSamples(sampleData);
        this.renderSampleButtons(samplerEngine.getSamples());
        await samplerEngine.loadAllSamples();
    }

    setupKeyboardListeners() {
        const physicalKeyMap = {
            'Digit1': 12, 'Digit2': 13, 'Digit3': 14, 'Digit4': 15,
            'KeyQ': 8, 'KeyW': 9, 'KeyE': 10, 'KeyR': 11,
            'KeyA': 4, 'KeyS': 5, 'KeyD': 6, 'KeyF': 7,
            'KeyZ': 0, 'KeyX': 1, 'KeyC': 2, 'KeyV': 3
        };
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const padIndex = physicalKeyMap[e.code];
            const sample = this.engine.getSamples()[padIndex];
            if (sample?.buffer) {
                this.engine.playSample(sample);
                const els = this.padElements.get(sample.name);
                if (els) {
                    els.button.classList.add("playing");
                    setTimeout(() => els.button.classList.remove("playing"), 150);
                }
            }
        });
    }

    setupMidiListeners() {
        this.$midiEnableBtn.onclick = async () => {
            try {
                this.midiAccess = await navigator.requestMIDIAccess();
                this.populateInputs();
                this.$midiInputSel.disabled = false;
                this.$midiStatus.textContent = "MIDI active";
            } catch (e) { this.$midiStatus.textContent = "Access denied"; }
        };
        this.$midiInputSel.onchange = () => this.bindSelectedMidiInput();
    }

    populateInputs() {
        this.$midiInputSel.innerHTML = "";
        this.midiAccess.inputs.forEach(input => {
            const opt = document.createElement("option");
            opt.value = input.id;
            opt.textContent = input.name || input.id;
            this.$midiInputSel.appendChild(opt);
        });
        this.bindSelectedMidiInput();
    }

    bindSelectedMidiInput() {
        if (this.currenMidiInput) this.currenMidiInput.onmidimessage = null;
        const input = Array.from(this.midiAccess.inputs.values()).find(i => i.id === this.$midiInputSel.value);
        if (!input) return;
        input.onmidimessage = (e) => {
            const [status, note, velocity] = e.data;
            if ((status & 0xF0) === 0x90 && velocity > 0) {
                const padIndex = note - this.BASE_NOTE;
                const sample = this.engine.getSamples()[padIndex];
                if (sample?.buffer) this.engine.playSample(sample);
            }
        };
        this.currenMidiInput = input;
    }

    setRecordControlsState(isRec, hasBuf) {
        this.$recordButton.disabled = isRec;
        this.$stopButton.disabled = !isRec;
        this.$playRecordedButton.disabled = !hasBuf;
        this.$addRecordedButton.disabled = !hasBuf;
    }

    setupRecordingListeners() {
        this.$recordButton.onclick = async () => {
            if (!this.engine.recorder) await this.engine.initrecorder();
            if (this.engine.recorder && !this.engine.isRecording) this.engine.startRecording();
        };
        this.$stopButton.onclick = () => this.engine.stopRecording();
        this.$playRecordedButton.onclick = () => this.engine.playRecordedSample();
        this.$addRecordedButton.onclick = () => {
            const name = prompt("Name for recording:", "Custom Rec");
            if (name && this.engine.addRecordedSample(name)) {
                this.renderSampleButtons(this.engine.getSamples());
            }
        };
    }


setupEqualizerListeners() {
    // EQ Sliders mapping
    document.querySelectorAll('.eq-slider').forEach(slider => {
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            const index = parseInt(e.target.dataset.filter);
            if (this.engine.filters[index]) {
                this.engine.filters[index].gain.value = val;
                const output = document.querySelector(`#gain${index}`);
                if (output) output.value = `${val} dB`;
            }
        };
    });

    // Master Gain
    const volSlider = document.querySelector('#masterVolumeSlider');
    if (volSlider) {
        volSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            this.engine.masterGain.gain.value = val / 10;
            const output = document.querySelector('#masterGainOutput');
            if (output) output.value = val;
        };
    }

    // Balance
    const balSlider = document.querySelector('#balanceSlider');
    if (balSlider) {
        balSlider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            this.engine.stereoPanner.pan.value = val;
            const output = document.querySelector('#balanceOutput');
            if (output) output.value = val;
        };
    }
}


}