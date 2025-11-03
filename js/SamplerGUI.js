import WaveformEditor from './GUI/WaveformEditor.js';

// Constants
const API_URL = 'http://localhost:3000/api/presets';
const AUDIO_BASE_PATH = 'http://localhost:3000/presets/';
let allPresetsData = [];

export default class SamplerGUI {
    
    
    constructor(engine, opts) {
        this.engine = engine;
        
        this.$buttoncontainer = opts.$buttoncontainer;
        this.$presetSelect = opts.$presetSelect;
        
        this.$midiEnableBtn =document.querySelector("#midiEnableBtn");
        this.$midiInputSel =document.querySelector("#midiInput");
        this.$midiStatus =document.querySelector("#midiStatus");

        this.midiAccess =null;
        this.currenMidiInput=null;
        this.BASE_NOTE=36;

        this.editor = new WaveformEditor(opts.canvas, opts.canvasOverlay, this.engine.playSample.bind(this.engine));
        
        this.setupEngineCallbacks();
        this.setupMidiListeners();
    }

    setupEngineCallbacks() {
        this.engine.onSampleReady = (sample) => {
            const button = document.getElementById(`pad-button-${sample.name}`);
            if (button) {
                const label= button.querySelector('span');
                if(label){
                    label.innerText = sample.name;
                }
                button.classList.remove('loading-pad');
                button.classList.add('ready-pad');
                button.disabled = false; 
            }
        };

        this.engine.onSampleError = (sample, error) => {
            const button = document.getElementById(`pad-button-${sample.name}`);
            if (button) {
                button.disabled = true; 
                button.textContent = `Error: ${sample.name}`;
                button.classList.add('error-pad');
            }
        };

        this.engine.onSampleSelect = (sample) => {this.editor.selectSample(sample);};
        
        this.engine.onProgress = (sample, received, total) => {
            const els = this.padElements.get(sample.name);
            console.log(`Progress debug for ${sample.name}:`, {
                foundElements: els,
                buttonHTML: els?.button?.innerHTML,
                progExists: els?.prog instanceof HTMLElement,
                barExists: els?.bar instanceof HTMLElement
            });

            if (!els || !els.bar) {
                console.warn(`Missing elements for ${sample.name}`);
                return;
            }

            

            let pct;
            if (total && total > 0) {
                pct = Math.max(0, Math.min(100, Math.floor((received / total) * 100)));
            } else {
                
                pct = Math.min(95, Math.floor(Math.log10((received || 0) * 25)));
            }
            
            const finalPct =Math.max(1,pct); 
            console.log(finalPct)
            
            els.bar.style.width=`${finalPct}%`;

            const computed = getComputedStyle(els.bar);
            console.log(`Progress ${sample.name}: ${pct}%`, {
                pct,
                inlineWidth: els.bar.style.width,
                computedWidth: computed.width,
                computedDisplay: computed.display,
                computedPosition: computed.position,
                barRect: els.bar.getBoundingClientRect()
            });
        };

    }
    
    renderSampleButtons(samples) {
        this.$buttoncontainer.innerHTML = '';
        
        const engine = this.engine;
        const PAD_COUNT = 16;
        
        const samplesByName = new Map();
        samples.forEach(sample => samplesByName.set(sample.name, sample));
        
        this.padElements=new Map();

        for (let i = 0; i < PAD_COUNT; i++) {
            const sample = samples[i]; 

            const button = document.createElement('button');
            
           const padID = sample 
                ? `pad-button-${sample.name}`
                : `pad-placeholder-${i}`; 

            button.id = padID;

            if (sample) {
                const contentDiv = document.createElement('div');
                contentDiv.classList.add('pad-content');

                const label = document.createElement('span');
                label.innerText = sample.name + (sample.buffer ? '' : ' (Loading...)');
                contentDiv.appendChild(label);  // Add label to contentDiv first

                button.appendChild(contentDiv);  // Then add contentDiv to button
                
                const progDiv = document.createElement('div');
                progDiv.classList.add('prog');
                
                const barDiv = document.createElement('div');
                barDiv.classList.add('bar');
                
                progDiv.appendChild(barDiv);
                button.appendChild(progDiv);

                button.classList.add('sample-pad', 'loading-pad');

                // Debug: Log created elements
                console.log(`Created elements for ${sample.name}:`, {
                    button,
                    prog: progDiv,
                    bar: barDiv,
                    html: button.innerHTML
                });

                this.padElements.set(sample.name, {
                    button,
                    prog: progDiv,
                    bar: barDiv
                });
            } else {
                button.innerText = `Pad ${i + 1} (Empty)`;
                button.disabled = true;
                button.classList.add('empty-pad');
            }

            this.$buttoncontainer.appendChild(button);
        }

        this.$buttoncontainer.addEventListener('click', (event) => {
            const button = event.target.closest('BUTTON');
            if (!button || button.disabled || !button.classList.contains('sample-pad')) {
                return; 
            }

            const sampleName = button.id.replace('pad-button-', '');
            
            const clickedSample = samplesByName.get(sampleName);

            if (clickedSample && clickedSample.buffer) {
                console.log("Button clicked for sample (delegated):", clickedSample.name);

                const currentSample = engine.getCurrentSample(); // Use getter from engine
                
                if (currentSample === clickedSample) {
                    //engine.forceUpdateCurrentSample();
                } else {
                    engine.selectSample(clickedSample);
                }
                
                engine.playSample(clickedSample);
            }
        });
    }


    async  fetchPresets($presetSelect,  opts) {

    try {
        const response = await fetch(API_URL);
        allPresetsData = await response.json();

        $presetSelect.innerHTML = '';
        let first_option = document.createElement('option');
        first_option.value = '';
        first_option.textContent = '-- Select a preset kit --';
        $presetSelect.appendChild(first_option);
        opts.$appTitle.textContent = "Beatpad - Kits loaded";

        if (allPresetsData.length === 0) {
            $presetSelect.innerHTML = '<option value="">No presets available</option>';
            return;
        }

        allPresetsData.forEach((pre, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = pre.name;
            $presetSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error fetching presets:", error);
        $presetSelect.innerHTML = '<option value="">Error loading presets</option>';
    }
}

    async handlePresetSelection(samplerEngine,  opts) {
    const $presetSelect = document.querySelector('#presetSelect');
    const selectedIndex = $presetSelect.value;
    if (selectedIndex === '') return;

    if (!allPresetsData || !allPresetsData[selectedIndex]) {
        console.error(`Preset data missing for index: ${selectedIndex}. Aborting selection.`);
        return;
    }

    const selectedPreset = allPresetsData[selectedIndex];

    if (opts.$appTitle && selectedPreset.name) {
        opts.$appTitle.textContent = `Beatpad - Loaded Kit: ${selectedPreset.name}`;
    }

    const files = Array.isArray(selectedPreset.samples) ? selectedPreset.samples : [];

    if (files.length === 0) {
        $buttoncontainer.innerHTML = '<p>No samples in this preset.</p>';
        samplerEngine.initializeSamples([]);
        return;
    }


    const sampleData = files.map(file => {
        const relativeURL = file.url;
        const fullURL = `${AUDIO_BASE_PATH}${relativeURL}`;
        return {
            name: file.name,
            fullURL: fullURL
        };
    });


    samplerEngine.initializeSamples(sampleData, selectedPreset.name);
    this.renderSampleButtons(samplerEngine.getSamples());
    await new Promise(resolve=> setTimeout(resolve,50));
    this.initLoadingBars();
    await samplerEngine.loadAllSamples();
}


initLoadingBars() {
        this.engine.getSamples().forEach(sample => {
            const els = this.padElements.get(sample.name);
            if (els && els.bar) {
                els.bar.style.transition = ''; 
                els.bar.style.width = '0%';
            }
        });
    }



setupMidiListeners(){
    this.$midiEnableBtn.addEventListener("click",async()=>{
        if(!navigator.requestMIDIAccess){
            this.$midiStatus.textContent = "Web MIDI isn't supportet";
            return;
        }
        try{
            this.midiAccess = await navigator.requestMIDIAccess();
            this.$midiStatus.textContent="MIDI activated. Choose Input Instrument";
            this.populateInputs();
            this.$midiInputSel.disabled=false;
            this.midiAccess.onstatechange = this.populateInputs.bind(this);
        }catch(e){
            this.$midiStatus.textContent="MIDI access refused";
            console.error("MIDI access error:",e);
        }
    });
    this.$midiInputSel.addEventListener("change", this.bindSelectedMidiInput.bind(this));
}

populateInputs() {
    this.$midiInputSel.innerHTML = "";
    
    if (!this.midiAccess || !this.midiAccess.inputs.size) {
        this.$midiInputSel.innerHTML = "<option>(no input)</option>";
        this.$midiInputSel.disabled = true;
        this.bindSelectedMidiInput(); 
        return;
    }
    
    this.midiAccess.inputs.forEach(input => {
        const opt = document.createElement("option");
        opt.value = input.id;
        opt.textContent = input.name || input.id;
        this.$midiInputSel.appendChild(opt);
    });

    this.bindSelectedMidiInput();
}

// In SamplerGUI.js
bindSelectedMidiInput() {
    if (this.currenMidiInput) {
        this.currenMidiInput.onmidimessage = null; 
    }

    const id = this.$midiInputSel.value;
   
    const input = Array.from(this.midiAccess?.inputs.values() || []).find(i => i.id === id);

    if (!input) {
        this.$midiStatus.textContent = "Device not found or no device selected.";
        this.currenMidiInput = null;
        return;
    }


    input.onmidimessage = (event) => {
        const [status, note, velocity] = event.data;
        const command = status & 0xF0;
        if (command === 0x90 && velocity > 0) {
            const padIndex = note - this.BASE_NOTE;
            
            const samples = this.engine.getSamples(); 
            
            if (padIndex >= 0 && padIndex < samples.length) {
                const sampleToPlay = samples[padIndex];
                
                if (sampleToPlay.buffer) {
                    this.engine.playSample(sampleToPlay);
                    
                    const els = this.padElements.get(sampleToPlay.name);
                    if (els) {
                        els.button.classList.add("playing");
                        setTimeout(()=>els.button.classList.remove("playing"), 150);
                    }
                }
            }
        }
    };

    this.currenMidiInput = input;
    this.$midiStatus.textContent = `Connected: ${input.name} `;
}

}