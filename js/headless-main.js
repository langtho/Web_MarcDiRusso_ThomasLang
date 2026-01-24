// headless-main.js

// Import the engine and the headless version of the backend
import SamplerEngine from './Engine/SamplerEngine.js';
import { HeadlessAudioBackend } from './Engine/AudioBackend.js';

async function initHeadless() {
    console.log("Starting Sampler in Headless Mode...");

    // 1. Initialize the Headless Backend
    // This backend avoids using actual hardware speakers
    const backend = new HeadlessAudioBackend();

    // 2. Initialize the Engine with the headless backend
    const samplerEngine = new SamplerEngine(backend, {
        onStatus: (sample, status) => {
            console.log(`Status [${sample ? sample.name : 'System'}]: ${status.message}`);
        },
        onProgress: (sample, received, total) => {
            const percent = total ? Math.round((received / total) * 100) : 'unknown';
            console.log(`Loading ${sample.name}: ${percent}%`);
        },
        onError: (sample, error) => {
            console.error(`Error in ${sample ? sample.name : 'System'}:`, error);
        }
    });

    // 3. Define sample data manually (since there is no GUI dropdown)
    const testSamples = [
        { name: "Kick", fullURL: "/presets/808/Clap_808.wav" },
        { name: "Snare", fullURL: "/presets/hip-hop/Clap_HipHop.wav" }
    ];

    // 4. Load the samples into the engine
    console.log("Initializing samples...");
    samplerEngine.initializeSamples(testSamples);

    // 5. Start the loading and decoding process
    console.log("Starting download and decode...");
    await samplerEngine.loadAllSamples();

    // 6. Verify results
    const loadedSamples = samplerEngine.getSamples();
    const successCount = loadedSamples.filter(s => s.buffer).length;

    console.log(`Headless check complete. Loaded ${successCount}/${loadedSamples.length} samples.`);
    
    if (successCount === loadedSamples.length) {
        console.log("Test Passed: All samples decoded successfully.");
    } else {
        console.warn("Test Failed: Some samples could not be loaded.");
    }
}

// Start the script
initHeadless().catch(err => {
    console.error("Headless Execution failed:", err);
});