// FreesoundService.js

export default class FreesoundService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://freesound.org/apiv2";
    }

    // Search for sounds based on a text query
    async search(query) {
        const url = `${this.baseUrl}/search/text/?query=${query}&token=${this.apiKey}&fields=id,name,previews,url`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Freesound search failed");
        const data = await response.json();
        return data.results; 
    }
}