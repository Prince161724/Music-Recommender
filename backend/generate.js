import fetch from 'node-fetch'
const Client_ID = "5d49ba0c18f840279f591a1456ffc362";
const Client_secret = "54709f64381642b2a593ab6b5cfb51b0";
async function fetchToken() {
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Authorization": "Basic " + Buffer.from(Client_ID + ":" + Client_secret).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
    });
    const data = await res.json();
    console.log("Token ", data.access_token);
}
fetchToken();