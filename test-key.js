const crypto = require('crypto');

function formatPrivateKey(keyString) {
    if (!keyString) return '';
    let key = keyString.replace(/\\n/g, '\n').replace(/"/g, '').trim();
    const beginMatch = key.match(/-----BEGIN [\w\s]+-----/);
    const endMatch = key.match(/-----END [\w\s]+-----/);
    if (beginMatch && endMatch) {
        let base64Part = key.substring(beginMatch.index + beginMatch[0].length, endMatch.index);
        base64Part = base64Part.replace(/\s+/g, '');
        const wrappedBase64 = base64Part.match(/.{1,64}/g)?.join('\n') || base64Part;
        return `${beginMatch[0]}\n${wrappedBase64}\n${endMatch[0]}`;
    }
    return key;
}

const mangled = '-----BEGIN PRIVATE KEY-----MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDU-----END PRIVATE KEY-----';
console.log(formatPrivateKey(mangled));
