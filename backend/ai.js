import { Agent, tool, run } from '@openai/agents';
import fetch from 'node-fetch';
import { z } from 'zod';
import dotenv from 'dotenv';
import { getSimilar } from './Last.js'
dotenv.config();


// 🔥 GET VIDEO ID (all edge cases handled)
function getMusic(link) {
    const url = new URL(link);
    let id = "";

    if ((url.hostname.includes("youtube.com") || url.hostname.includes("m.youtube.com")) && url.searchParams.get("v")) {
        id = url.searchParams.get("v");
    }
    else if (url.hostname.includes("youtu.be")) {
        id = url.pathname.slice(1).split("?")[0];
    }
    else if (url.pathname.includes("shorts")) {
        id = url.pathname.split("shorts/")[1].split("?")[0];
    }
    else if (url.pathname.includes("embed")) {
        id = url.pathname.split("embed/")[1].split("?")[0];
    }

    return id;
}


// 🔥 TOOL
const firstTool = tool({
    name: "Song_Identifier_Tool",
    description: "Takes a YouTube link and returns title and channel. ALWAYS use this tool before answering.",
    parameters: z.object({
        link: z.string()
    }),

    execute: async function ({ link }) {
        console.log("🔥 TOOL CALLED with link:", link);

        const API_KEY = process.env.YOUTUBE_API_KEY;
        console.log("🔑 KEY:", API_KEY ? `${API_KEY.slice(0, 8)}...` : "❌ MISSING");  // 👈 ADD THIS
        const videoId = getMusic(link);

        if (!videoId) {
            console.log("❌ Could not extract video ID");
            return { title: "", channel: "" };
        }

        console.log("📺 Video ID:", videoId);

        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`);
        const data = await res.json();

        if (!data.items || data.items.length === 0) {
            console.log("❌ No items found from YouTube API");
            return { title: "", channel: "" };
        }

        const title = data.items[0].snippet.title;
        const channel = data.items[0].snippet.channelTitle;

        console.log("✅ TITLE:", title);
        console.log("✅ CHANNEL:", channel);

        return { title, channel };
    }
});


// 🔥 OUTPUT STRUCTURE
const output = z.object({
    songname: z.string(),
    artistname: z.string(),
    channelname: z.string()
});


// 🔥 AGENT
const agent = new Agent({
    name: "Music_Finder_Agent",
    instructions: `
You MUST call the tool "Song_Identifier_Tool" before answering. No exceptions.

The user will send a YouTube link as a plain string.

Steps:
1. Call the tool with:
   { "link": "<the YouTube link from input>" }
2. Get title and channel from the result
3. Extract artist and song name

Rules:
- Ignore words like Official, HD, Lyrics, Video, Audio
- Remove brackets (), [], {}
- If format is "Artist - Song", use that
- If unclear, use channel as artist

Return strictly:
{
  "songname": "...",
  "artistname": "...",
  "channelname": "..."
}
`,
    tools: [firstTool],
    outputType: output,
    modelSettings: {
        tool_choice: "required"
    }
});


// 🔥 RUN
export async function main(link) {

    return run(
        agent,
        link
    )
        .then(async (data) => { console.log(data.finalOutput); return await getSimilar(data.finalOutput.artistname, data.finalOutput.songname); })
        .catch(err => console.error("❌ ERROR:", err));
}