import SamplerEngine from './Engine/SamplerEngine.js';
import SamplerGUI from './GUI/SamplerGUI.js';
import { WebAudioBackend } from './Engine/AudioBackend.js';

window.onload = async function init() {
    const config = {
        apiUrl: 'http://localhost:3000/api/presets',
        audioBasePath: 'http://localhost:3000/presets/',
        fsApiKey : "SF19OkX8syIplOcKsjGQggpGHoXr0rg0E9CteBZG" 
    };
    const opts = {
        canvas: document.querySelector('#myCanvas'),
        canvasOverlay: document.querySelector('#myCanvasOverlay'),
        $buttoncontainer: document.querySelector('#buttonContainer'),
        $presetSelect: document.querySelector('#presetSelect'),
        $loadKitButton: document.querySelector('#loadKitButton'),
        $appTitle: document.querySelector('#app-title'),
        $recordButton : document.querySelector('#recordButton'),
        $stopButton : document.querySelector('#stopButton'),
        $playRecordedButton : document.querySelector('#playRecordedButton'),
        $addRecordedButton : document.querySelector('#addRecordedButton'),
        $recordStatus : document.querySelector('#recordStatus')
    };

    if (Object.values(opts).some(el => el === null)) {
        console.error("Missing DOM elements");
        return;
    }

   

    // Initialize backend and engine
    const backend = new WebAudioBackend();
    const samplerEngine = new SamplerEngine(backend);
    const samplerGUI = new SamplerGUI(samplerEngine, opts, config);

   

    document.addEventListener('click', () => {
        samplerEngine.ensureAudioContextRunning();
    }, { once: true });

    await samplerGUI.fetchPresets(opts.$presetSelect, opts);

    opts.$loadKitButton.addEventListener('click', () => {
        samplerGUI.handlePresetSelection(samplerEngine, opts);
    });
};