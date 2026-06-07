"use strict";

/* ========= Tool: Base64/ROT13 ========= */
function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin);
}

function b64ToUtf8(b64) {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

function getTextCodec(algorithm) {
    const codecs = {
        base64: {
            name: "Base64",
            encode: utf8ToB64,
            decode: b64ToUtf8,
            decodeInput: (value) => value.trim()
        },
        rot13: {
            name: "ROT13",
            encode: (value) => window.OnlineToolsRot13.encode(value),
            decode: (value) => window.OnlineToolsRot13.decode(value),
            decodeInput: (value) => value
        }
    };

    return codecs[algorithm] || codecs.base64;
}

function initBase64() {
    const algorithm = $("#b64Algorithm");
    const input = $("#b64Input");
    const output = $("#b64Output");
    const status = $("#b64Status");

    const encodeBtn = $("#b64Encode");
    const decodeBtn = $("#b64Decode");
    const swapBtn = $("#b64Swap");
    const clearBtn = $("#b64Clear");
    const copyBtn = $("#b64Copy");

    if (!algorithm || !input || !output || !status || !encodeBtn || !decodeBtn || !swapBtn || !clearBtn || !copyBtn) return;

    const setStatus = (msg, isError = false) => {
        status.textContent = msg;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    const selectedCodec = () => getTextCodec(algorithm.value);

    encodeBtn.addEventListener("click", () => {
        const codec = selectedCodec();

        try {
            output.value = codec.encode(input.value);
            setStatus(`${codec.name} kodiert.`);
            setAnnounce(`${codec.name} kodiert`);
        } catch (e) {
            setStatus(`Fehler beim ${codec.name}-Kodieren.`, true);
        }
    });

    decodeBtn.addEventListener("click", () => {
        const codec = selectedCodec();

        try {
            output.value = codec.decode(codec.decodeInput(input.value));
            setStatus(`${codec.name} dekodiert.`);
            setAnnounce(`${codec.name} dekodiert`);
        } catch (e) {
            setStatus(`Ungültige ${codec.name}-Eingabe.`, true);
        }
    });

    algorithm.addEventListener("change", () => {
        const codec = selectedCodec();
        setStatus(`Algorithmus: ${codec.name}.`);
        setAnnounce(`Algorithmus ${codec.name} ausgewählt`);
    });

    swapBtn.addEventListener("click", () => {
        const tmp = input.value;
        input.value = output.value;
        output.value = tmp;
        setStatus("Eingabe/Ausgabe getauscht.");
    });

    clearBtn.addEventListener("click", () => {
        input.value = "";
        output.value = "";
        setStatus("Geleert.");
    });

    copyBtn.addEventListener("click", async () => {
        try {
            await safeCopy(output.value);
            setStatus("Ausgabe kopiert.");
        } catch {
            setStatus("Kopieren nicht möglich.", true);
        }
    });
}

window.OnlineToolsBase64 = {
    encode: utf8ToB64,
    decode: b64ToUtf8,
    init: initBase64
};

/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", () => {
    initBase64();
});
