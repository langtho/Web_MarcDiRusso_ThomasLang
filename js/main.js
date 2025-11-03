import SamplerEngine from './SamplerEngine.js';
import SamplerGUI from './SamplerGUI.js';


window.onload = async function init() {

    const opts = {
        canvas: document.querySelector('#myCanvas'),
        canvasOverlay: document.querySelector('#myCanvasOverlay'),
        $buttoncontainer: document.querySelector('#buttonContainer'),
        $presetSelect: document.querySelector('#presetSelect'),
        $loadKitButton: document.querySelector('#loadKitButton'),
        $appTitle: document.querySelector('#app-title')
    };

    if (Object.values(opts).some(el => el === null)) {
        console.error("One or more required DOM elements are missing.");
        return;
    }

    const samplerEngine = new SamplerEngine();
    const samplerGUI = new SamplerGUI(samplerEngine, opts);

    this.document.addEventListener('click', () => {
        samplerEngine.ensureAudioContextRunning();
    });

    // Fetch presets on load
    await samplerGUI.fetchPresets(opts.$presetSelect,opts);

    // Load samples when the loadKitButton is clicked
    opts.$loadKitButton.addEventListener('click', () => {
        samplerGUI.handlePresetSelection(samplerEngine, opts);
    });

};

