let onlyup, dotsInterval, wordsInterval, process
let currentlineHeight = 10
let stopgrowing = false
let i = 0
let popup, content, errorImg, copyLogo, checkmark, textBtn, div, divText, copyBtn, textNod, closeBtn
let hiddenTagName, hiddenHost, visibleTagName, visibleHost
const processText = ["Translating", "Getting data", "Data processing", "Completing"]
const lineInPX = 19.2
const popupWidth = 400
const offset = 10
const headersHeight = 25
const defaultHeight = 55
const fontSize = 16

function changePopup(height, bottom, top) {
    return new Promise((resolve) => {
        console.log("height = ", height, "bottom = ", bottom, "top = ", top)
        if (height) {popup.style.height = height}
        if (top) {
            if (parseFloat(top) >= 0) {
                popup.style.top = top
            } else {
                popup.style.top = "0px"
            }
        }
        if (bottom) {popup.style.bottom = bottom}

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    })
}

function turnOnOverFlow() {
    return new Promise((resolve) => {
        content.style.overflow = "auto"
        content.scrollWidth = "auto"

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    })
}

const observer = new ResizeObserver(entries => {
    for (let entry of entries) {
        var top, height, bottom;
        const popupRect = popup.getBoundingClientRect();
        const popupTop = popupRect.top;
        const popupBottom = popupRect.bottom;
        const newHeight = entry.contentRect.height;
        if (!stopgrowing) {
            // if the popup is upper
            if ((currentlineHeight < newHeight) && (onlyup)) {
                if (popupTop <= 0) {
                    if (popupBottom < window.innerHeight) {
                        // grows down
                        console.log("grows down")
                        top = `0px`
                        bottom = `${popupBottom - (newHeight - currentlineHeight)}px`;
                        currentlineHeight = newHeight
                        height = `${headersHeight + defaultHeight + currentlineHeight}px`
                    } else {
                        console.log("stops growing")
                        // starts addiding new text into a container,
                        // but doesn't let grow the popup.
                        height = "100vh";
                        stopgrowing = true
                        currentlineHeight = Infinity
                        turnOnOverFlow().then(() => console.log("overflow is tuned on"))
                    }
                } else {
                    // grows up
                    console.log("grows up")
                    top = `${popupTop - (newHeight - currentlineHeight)}px`
                    currentlineHeight = newHeight
                }
                changePopup(height, bottom, top).then(() => console.log("popup has been changed"))
            // if the popup is under
            } else if ((currentlineHeight < newHeight) && (!onlyup)) {
                console.log("popupBottom = ", popupBottom, "window.innerHeight = ", window.innerHeight, "is popupBottom greater?: ", popupBottom > window.innerHeight)
                if (popupBottom > window.innerHeight) {
                    if (popupTop <= 0) {
                        console.log("stops growing")
                        // starts addiding new text into a container,
                        // but doesn't let grow the popup.
                        height = "100vh"
                        bottom = `${window.innerHeight}px`;
                        top = "0px";
                        stopgrowing = true
                        currentlineHeight = Infinity
                        turnOnOverFlow().then(() => console.log("overflow is tuned on"))
                    } else {
                        // grows up
                        console.log("grows up")
                        bottom = `${window.innerHeight}px`
                        top = `${popupTop - (newHeight - currentlineHeight)}px`;
                        currentlineHeight = newHeight
                        height = `${headersHeight + defaultHeight + currentlineHeight}px`
                    }
                } else {
                    console.log("grows down")
                    currentlineHeight = newHeight
                    height = `${headersHeight + defaultHeight + currentlineHeight}px`
                }
                changePopup(height, bottom, top).then(() => console.log("popup has been changed"))
            }
        }
    }
})

function errorChanges() {
    return new Promise((resolve) => {
        content.style.animation = "none"
        content.style.background = "none"
        content.style.color = "#0d0d0d"
        textNod.textContent = "Sorry, I curently can't help you."
        errorImg.style.display = "block"

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function turnOffAnimationAndCleanText() {
    return new Promise((resolve) => {
        content.style.animation = "none";
        content.style.background = "none";
        content.style.color = "#0d0d0d";
        textNod.textContent = "";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function regularTextChange(text){
    return new Promise((resolve) => {
        divText.textContent += text;
        textNod.textContent += text;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function clearTheField() {
    return new Promise((resolve) => {
        divText.textContent = "";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function stopLoadingAnimation() {
    clearInterval(dotsInterval);
    clearInterval(wordsInterval);
    dotsInterval = null;
    wordsInterval = null;
    i = 0
}

function responseHandler(buffer, decoder, value) {
    var eventType, data;
    buffer.value += decoder.decode(value, { stream: true });
    const parts = buffer.value.split("\n\n");
    buffer.value = parts.pop();

    for (let part of parts) {
        const lines = part.split("\n");
        eventType = "message";
        data = "";

        for (const line of lines) {
            if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
                data += line.slice(5).trim();
            }
        }

        try {
            const parsed = JSON.parse(data);
            
            if (eventType === "data") {
                if (process) {
                    console.log("got first data from a stream")
                    process = false;
                    chrome.storage.local.set({ user_id: parsed.user_id })
                    turnOffAnimationAndCleanText().then(() => {
                        stopLoadingAnimation();
                        console.log("turned off text animation")
                    });
                }
                
                regularTextChange(parsed.text).then(() => {
                    console.log("changed the text content in two containers")
                })

            } else if (eventType === "final_data") {
                console.log("final data comes")
                observer.disconnect();
                currentlineHeight = 20;
                stopgrowing = false;
                clearTheField().then(() => {
                    console.log("stream ended OK")
                })
            }

        } catch (err) {
            console.error("Failed to parse SSE JSON:", err, data);
        }
    }
}

async function streamTranslation(text) {
    console.log("starting streaming")
    const port = chrome.runtime.connect({ name: "stream_data" });
    const userID = await new Promise((resolve) => {
                chrome.storage.local.get(["user_id"], (result) => {
                    resolve(Number(result.user_id) || 0);
                });
            });
    const language = await new Promise((resolve) => {
                chrome.storage.local.get(["new_language"], (result) => {
                    resolve(result.new_language || navigator.language.slice(0, 2));
                });
            });
    const decoder = new TextDecoder("utf-8");
    var buffer = { value: "" };

    port.postMessage({
        user_id: userID,
        lang_code: language,
        text: text,
    });


    port.onMessage.addListener((msg) => {
        if (msg.done) {
            console.log("stream ends")
            copyBtn.style.display = "flex"
        } else if (msg.error) {
            console.log("got an error")
        } else if (msg.chunk) {
            const uint8array = new Uint8Array(msg.chunk)
            responseHandler(buffer, decoder, uint8array)
        }
    })

    port.onDisconnect.addListener(() => {
        console.log("Port disconnected");
    });
}

function startLoadingAnimation() {
    let dotCount = 0;
    process = true;
    wordsInterval = setInterval(() => {if (i + 1 > processText.length-1) {i = 0} else {i++}}, 4000)
    dotsInterval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        textNod.textContent = `${processText[i]}${'.'.repeat(dotCount)}`;
    }, 300);
}

function setUpPopup(top, left) {
    return new Promise((resolve) => {
        popup.style.top = top;
        popup.style.left = left;
        popup.style.display = "flex";

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function showTranslationPopup(selection, text) {
    let left, top, res;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (window.innerWidth < rect.left + popupWidth) {
        left = `${window.innerWidth - popupWidth}px`;
    } else {
        left = `${rect.left}px`
    }

    if (rect.top > window.innerHeight - rect.bottom) {
      
        console.log("popup is upper")
        res = rect.top - offset - defaultHeight - headersHeight
        if (res > 0) {
            top = `${res}px`;
            onlyup = true
        } else {
            top = "0px";
        }
    } else {
        // the popup is under
        console.log("popup is under")
        top = `${rect.bottom + offset}px`
        onlyup = false
    }

    console.log("at the moment of appearens: top = ", top, "left = ", left)
    setUpPopup(top, left).then(() => {
        startLoadingAnimation(text);
    })
}

function canShow(selection) {
    if (!selection.rangeCount) return false;

    if (window.innerWidth < popupWidth) {
        alert("Your display isn't suitable")
        return false
    }

    return true
}

function createTextHolder(text) {
    return new Promise((resolve) => {
        console.log("there's some text: ", text)
        divText.textContent = text;

        requestAnimationFrame(() => {
            console.log(div)
            const height = div.offsetHeight;
            divText.textContent = "";
            observer.observe(divText);
            resolve(height);
        });
    });
}

function theBeginingOfTheLogic() {
    console.log("got called from shortcut")
    const selectedText = window.getSelection().toString();
    console.log("got selected text", selectedText)
    if (selectedText) {
        createTextHolder(selectedText).then((height) => {
            const selection = window.getSelection();
            console.log("got height and selection")
            if (canShow(selection)) {
                showTranslationPopup(selection, processText);
                console.log("showed popup")
                streamTranslation(selectedText);
            }
        })
    }
}

function copyText() {
    return new Promise((resolve) => {
        copyLogo.style.display = "none";
        checkmark.style.display = "block";
        textBtn.textContent = "Copied";

        navigator.clipboard.writeText(content.textContent).catch(err => {
            console.error("Failed to copy text: ", err);
            alert("Failed to copy text.");
        });

        setTimeout(() => {
            return new Promise((resolve) => {
                copyLogo.style.display = "block";
                checkmark.style.display = "none";
                textBtn.textContent = "Copy";
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            })
        }, 3000);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resolve();
            });
        });
    });
}

function generateUniqueTagName(base = "ai-translate") {
    const uniqueId = crypto.randomUUID();
    return `${base}-${uniqueId}`;
}

function hidden() {
    return new Promise((resolve) => {
        hiddenTagName = generateUniqueTagName()
        hiddenHost = document.createElement(hiddenTagName);
        document.body.appendChild(hiddenHost);
        const shadow = hiddenHost.attachShadow({ mode: 'open' });
        const windowImg = chrome.runtime.getURL('icons/very_small_logo.png')

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-Regular.ttf")}') format('truetype');
                    font-weight: 400;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-SemiBold.ttf")}') format('truetype');
                    font-weight: 600;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-Bold.ttf")}') format('truetype');
                    font-weight: 700;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-Black.ttf")}') format('truetype');
                    font-weight: 900;
                    font-style: normal;
                }
                    
                #hidden_holder {
                    visibility: hidden;
                    display: flex;
                    position: fixed;
                    width: 400px;
                    background-color: #f8f8f8;
                    color: rgb(13, 13, 13);
                    border: 2px solid #787878;
                    border-radius: 8px;
                    z-index: 9999;
                    max-width: 95%;
                    flex-direction: column; 
                }

                #hidden_text_container {
                    visibility: hidden;
                    padding: 3% 4%;
                    font-family: 'Inter', sans-serif;
                    font-size: 16px;
                    line-height: 1.5;
                    word-wrap: break-word; 
                    height: 100%;
                }

                #hidden_headers {
                    visibility: hidden;
                    display: flex;
                    height: 25px;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1% 4%;
                    background-color: #c6c6c6;
                    color: #0d0d0d;
                    border-bottom: 2px solid #acacac;

                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;

                    flex-shrink: 0;
                }

                #hidden_img {
                    visibility: hidden;
                }

                #hidden_title {
                    visibility: hidden;
                }
            </style>
            <div id="hidden_holder">
                <div id="hidden_headers">
                    <img id="hidden_img" class="window-img" src=${windowImg}>
                    <span id="hidden_title" class="window-title">AI Translate</span>
                </div>
                <div id="hidden_text_container"></div>
            </div>
        `;

        shadow.appendChild(template.content.cloneNode(true));
        resolve(shadow);
    });
}

function visible() {
    return new Promise((resolve) => {
        visibleTagName = generateUniqueTagName()
        visibleHost = document.createElement(visibleTagName);
        document.body.appendChild(visibleHost);
        const shadow = visibleHost.attachShadow({ mode: 'open' });
        const smallLogo = chrome.runtime.getURL("icons/very_small_logo.png")
        const copyLogoImg = chrome.runtime.getURL("icons/icon_copy_black.png")
        const closeLogoImg = chrome.runtime.getURL("icons/close_logo.png")
        const checkmarkLogo = chrome.runtime.getURL("icons/checkmark_black.png")
        const errImg = chrome.runtime.getURL("/icons/error.png")

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-Regular.ttf")}') format('truetype');
                    font-weight: 400;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-SemiBold.ttf")}') format('truetype');
                    font-weight: 600;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-Bold.ttf")}') format('truetype');
                    font-weight: 700;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'Inter';
                    src: url('${chrome.runtime.getURL("fonts/Inter-Black.ttf")}') format('truetype');
                    font-weight: 900;
                    font-style: normal;
                }

                .window {
                    display: none;
                    position: fixed;
                    width: 400px;
                    max-height: 100vh; 
                    background-color: #f8f8f8;
                    color: rgb(13, 13, 13);
                    border: 2px solid #787878;
                    border-radius: 8px;
                    z-index: 9999;
                    max-width: 95%;
                    flex-direction: column; 
                }

                .window-header {
                    display: flex;
                    height: 25px;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1% 4%;
                    background-color: #c6c6c6;
                    color: #0d0d0d;
                    border-bottom: 2px solid #acacac;

                    border-top-left-radius: 8px;
                    border-top-right-radius: 8px;

                    flex-shrink: 0;
                }

                .icon-name-holder {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .window-title {
                    font-family: 'Inter', sans-serif;
                    font-size: 18px;
                    font-weight: 600;
                }

                .button-holder {
                    display: flex;
                }

                .copy-btn {
                    display: none;
                    align-items: center;
                    justify-content: center;
                    gap: 3px;

                    background-color: #c6c6c6;
                    border: none;
                    padding: 5px 0px 5px 15px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                .copy-btn p {
                    margin: 0;
                    color: #0d0d0d;
                    font-size: 12px; 
                }

                .copy-logo {
                    width: 12px;
                    height: 12px;
                    transform: rotateX(0deg);
                }

                .checkmark-logo {
                    display: none;
                    width: 12px;
                    height: 12px;
                }

                .close-btn {
                    display: block;
                    background-color: #c6c6c6;
                    border: none;
                    padding: 6px 0px 5px 15px;
                    cursor: pointer;
                }

                .close-logo {
                    width: 12px;
                    height: 12px;
                }

                .window-content {
                    display: flex;
                    padding: 3% 4%;
                    font-family: 'Inter', sans-serif;
                    font-size: 16px;
                    line-height: 1.5;
                    word-wrap: break-word; 
                    background: linear-gradient(
                        90deg,
                        #0d0d0d 0%,
                        #c0c0c0 30%,
                        #0d0d0d 60%
                    );
                    background-size: 200%;
                    background-clip: text;
                    -webkit-background-clip: text;
                    color: transparent;
                    animation: shimmer 1.8s infinite ease-in-out;
                    height: 100%;
                }

                .window-content::-webkit-scrollbar {
                    width: 8px;
                }

                .window-content::-webkit-scrollbar-thumb {
                    background: #888;
                }

                .window-content::-webkit-scrollbar-track {
                    background: #f8f8f8;
                }

                .error-img {
                    display: none;
                    width: 17px;
                    height: 17px;
                    vertical-align: middle;
                    margin-right: 8px;
                    margin-top: 2px;
                }

                @keyframes shimmer {
                    0% {
                        background-position: -100% 0;
                    }
                    100% {
                        background-position: 100% 0;
                    }
                }
            </style>
            <div id="translation_window" class="window">
                <div class="window-header">
                    <div class="icon-name-holder">
                        <img class="window-img" src=${smallLogo}>
                        <span class="window-title">AI Translate</span>
                    </div>
                    <div class="button-holder">    
                        <button class="copy-btn" id="copy_btn">
                            <img class="copy-logo" id="copy_logo" src=${copyLogoImg}>
                            <img class="checkmark-logo" id="checkmark_logo" src=${checkmarkLogo}>
                            <p class="btn-text" id="btn_text"> Copy</p>
                        </button>
                        <button class="close-btn" id="close_btn">
                            <img class="close-logo" id="close_logo" src=${closeLogoImg}>
                        </button>
                    </div>
                </div>
                <div class="window-content" id="window_content">
                    <img class="error-img" id="error_img" src=${errImg}>
                    Translating
                </div>
            </div>`;

        shadow.appendChild(template.content.cloneNode(true));
        resolve(shadow);
    });
}


function waitForRender(callback) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setTimeout(callback, 0);
        });
    });
}

function dataIntoLets(hidden, visible) {
    popup = visible.getElementById('translation_window')
    content = visible.getElementById('window_content')
    errorImg = visible.getElementById('error_img')
    copyLogo = visible.getElementById('copy_logo')
    checkmark = visible.getElementById('checkmark_logo')
    textBtn = visible.getElementById('btn_text')
    div = hidden.getElementById('hidden_holder');
    textNod = content.childNodes[2];
    console.log("content.childNodes: ", content.childNodes, "textNod.nodeType = ",textNod.nodeType, Node.TEXT_NODE)
    divText = hidden.getElementById('hidden_text_container')
    copyBtn = visible.getElementById('copy_btn')
    closeBtn = visible.getElementById('close_btn')
    addListeners()
}

function init() {
    return new Promise((resolve) => {
        hidden().then((hiddenLink) => {
            visible().then((visibleLink) => {
                waitForRender(() => {
                    dataIntoLets(hiddenLink, visibleLink);
                    resolve();
                });
            })
        })
    })
}
