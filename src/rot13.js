"use strict";

/* ========= Tool helper: ROT13 ========= */
function rot13Transform(str) {
    return str.replace(/[A-Za-z]/g, (char) => {
        const base = char <= "Z" ? 65 : 97;
        const rotated = ((char.charCodeAt(0) - base + 13) % 26) + base;
        return String.fromCharCode(rotated);
    });
}

function encodeRot13(str) {
    return rot13Transform(str);
}

function decodeRot13(str) {
    return rot13Transform(str);
}

window.OnlineToolsRot13 = {
    encode: encodeRot13,
    decode: decodeRot13
};
