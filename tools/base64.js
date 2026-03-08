

/* ========= Tool: Base64 ========= */
function initBase64() {
    const input = $("#b64Input");
    const output = $("#b64Output");
    const status = $("#b64Status");

    const encodeBtn = $("#b64Encode");
    const decodeBtn = $("#b64Decode");
    const swapBtn = $("#b64Swap");
    const clearBtn = $("#b64Clear");
    const copyBtn = $("#b64Copy");

    if (!input || !output || !status || !encodeBtn || !decodeBtn || !swapBtn || !clearBtn || !copyBtn) return;

    const setStatus = (msg, isError = false) => {
        status.textContent = msg;
        status.style.color = isError ? "var(--danger)" : "var(--muted)";
    };

    const utf8ToB64 = (str) => {
        // Handles UTF-8 safely
        const bytes = new TextEncoder().encode(str);
        let bin = "";
        bytes.forEach(b => bin += String.fromCharCode(b));
        return btoa(bin);
    };

    const b64ToUtf8 = (b64) => {
        const bin = atob(b64);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    };

    encodeBtn.addEventListener("click", () => {
        try {
            output.value = utf8ToB64(input.value);
            setStatus("Kodiert.");
            setAnnounce("Base64 kodiert");
        } catch (e) {
            setStatus("Fehler beim Kodieren.", true);
        }
    });

    decodeBtn.addEventListener("click", () => {
        try {
            output.value = b64ToUtf8(input.value.trim());
            setStatus("Dekodiert.");
            setAnnounce("Base64 dekodiert");
        } catch (e) {
            setStatus("Ungültiges Base64.", true);
        }
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


/* ========= Boot ========= */
document.addEventListener("DOMContentLoaded", () => {
    initBase64();
});