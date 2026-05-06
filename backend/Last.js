import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export async function getSimilar(artist, song) {
    const API_KEY = process.env.LAST_FM;

    const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(song)}&api_key=${API_KEY}&format=json`;

    try {
        const res = await fetch(url);

        // ❗ FIX: response check
        if (!res.ok) {
            const text = await res.text();
            console.log("HTTP ERROR:", text);
            return [];
        }

        const data = await res.json();

        // console.log("FULL RESPONSE:", data); // debug

        // ❗ FIX: API error check
        if (data.error) {
            console.log("API ERROR:", data.message);
            return [];
        }

        // ❗ FIX: safe access
        if (!data.similartracks || !data.similartracks.track) {
            console.log("No similar tracks found");
            return [];
        }

        return data.similartracks.track;

    } catch (err) {
        console.log("FETCH ERROR:", err.message);
        return [];
    }
}