import fetch from 'node-fetch';

const token = "BQDNiAw1mIilxL4gE8CF03JcjmS7KpIrMIIpoEysBWAM_J1Kjh8yXM9g3zm3qqXrHsk-8cEoKFthmnacUSQ-CjDBsK6G2pf19AfGA8yI1nAgoEXFp-WLeDCu-QYhq5sxGc5BTmopDDM";

async function getSong() {
    const res = await fetch("https://api.spotify.com/v1/tracks/4uLU6hMCjMI75M1A2tKUQC", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    // 👇 pehle check kar
    if (!res.ok) {
        const text = await res.text();
        console.log("Error:", text);
        return;
    }

    const data = await res.json();

    console.log("Song Name:", data.name);
    console.log("Artist Name:", data.artists[0].name);
}

getSong();