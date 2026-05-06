async function getMusic(link) {
    const url = new URL(link);
    let id = "";

    if ((url.hostname.includes("youtube.com") || url.hostname.includes("m.youtube.com")) && url.searchParams.get("v")) {
        id = url.searchParams.get("v");
    }
    else if (url.hostname.includes("youtu.be")) {
        id = url.pathname.slice(1);
    }
    else if (url.pathname.includes("shorts")) {
        id = url.pathname.split("shorts/")[1];
    }
    else if (url.pathname.includes("embed")) {
        id = url.pathname.split("embed/")[1];
    }

    return id;
}
await getMusic("https://www.youtube.com/watch?v=ZJDx4ZfrsaA&list=RDGMEMQ1dJ7wXfLlqCjwV0xfSNbAVMI0czvJ_jikg&index=7").then(id => console.log(id));