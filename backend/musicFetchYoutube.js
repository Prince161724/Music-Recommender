import fetch from 'node-fetch';
const api = "";
async function getMusic(videoId) {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${api}`, {

    });
    const data = await res.json();
    console.log(data);
}