export class SoundSample {
    constructor(name, url) {
        this.name = name;
        this.url = url;
        this.buffer = null;

        this.trimStart = 0;
        this.trimEnd = 1.0;
    }   

}