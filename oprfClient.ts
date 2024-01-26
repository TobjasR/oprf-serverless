const OPRF = require('oprf');
import axios from 'axios';
const base64url = require('base64url');

// Convert base64url to UTF-8
function base64urlToUtf8(input: string): string {
    // Replace base64url specific characters with base64 equivalents
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
}
// Convert UTF-8 to base64url
function utf8ToBase64url(input: string): string {
    const base64 = Buffer.from(input, 'utf8').toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
// Convert hex to UTF-8
function hexToUtf8(input: string): string {
    return Buffer.from(input, 'hex').toString('utf8');
}
// Convert UTF-8 to hex
function utf8ToHex(input: string): string {
    return Buffer.from(input, 'utf8').toString('hex');
}
const green = "\x1b[32m%s\x1b[0m";
const red = "\x1b[31m%s\x1b[0m";
const yellow = "\x1b[33m%s\x1b[0m";
const blue = "\x1b[34m%s\x1b[0m";

export async function oprfClient(serverUrl: string, clientId: string, password: string, encoding: string = 'UTF-8') {
    const oprf = new OPRF();
    await oprf.ready; // wait for dependencies to load
    // 1.) Client: hash password to curve point
    console.log("Hashing password to curve point...");
    const hashPoint = oprf.hashToPoint(password);
    const hashPointIsValid = oprf.isValidPoint(hashPoint);
    if (hashPointIsValid) {
        console.log(green, "Hash Point is valid.");
    } else {
        throw new Error("Hash Point is invalid. This should never happen.");
    }
    let maskedPoint: { point: Uint8Array; mask: Uint8Array; };
    let encodedMaskedSaltedPoint: string;
    let maskedSaltedPoint, saltedPoint: Uint8Array;
    let maskedSaltedPointIsValid, saltedPointIsValid = false;
    // 2.) Evaluate the OPRF function on a randomly masked point until unmasked point is valid
    do {
        // mask Hash Point using a randomly generated 32-byte number
        console.log("Masking hash point...");
        maskedPoint = oprf.maskInput(hashPoint);
        const maskedPointIsValid = oprf.isValidPoint(maskedPoint.point);
        if (maskedPointIsValid) {
            // in green: 
            console.log(green, "Masked Point is valid.");
        } else {
            throw new Error("Masked Point is invalid. This should never happen.");
        }
        // Encode and send maskedPoint.point to the server. (Never send maskedPoint.mask!)
        let encodedMaskedPoint = oprf.encodePoint(maskedPoint.point, 'UTF-8');
        let input: string;
        if (encoding === 'base64url') {
            input = utf8ToBase64url(encodedMaskedPoint);
        } else if (encoding === 'hex') {
            input = utf8ToHex(encodedMaskedPoint);
        } else {
            input = encodedMaskedPoint;
        }
        console.log(`Input to OPRF (${encoding}-encoded):`);
        console.log(blue, input);
        try {
            console.log(`Sending input (masked point) to server (${clientId} @ ${serverUrl}) ...`);
            const response = await axios.post(serverUrl, {
                id: clientId,
                input: input
            });
            console.log(green, "Received output (salted masked point) from server.");
            const output = response.data.output;
            console.log(`Salted masked point (${encoding}-encoded):`);
            console.log(blue, output);
            if (encoding === 'base64url') {
                encodedMaskedSaltedPoint = base64urlToUtf8(output);
            } else if (encoding === 'hex') {
                encodedMaskedSaltedPoint = hexToUtf8(output);
            } else {
                encodedMaskedSaltedPoint = output;
            }
            console.log("Decoding salted masked point...");
            maskedSaltedPoint = oprf.decodePoint(encodedMaskedSaltedPoint, 'UTF-8');
            // 3.) Unmask the salted point from the server to get a high-entropy output
            maskedSaltedPointIsValid = oprf.isValidPoint(maskedSaltedPoint);
            if (maskedSaltedPointIsValid) {
                console.log(green, "Salted masked point is valid.");
                try {
                    console.log("Unmasking salted point...");
                    saltedPoint = oprf.unmaskPoint(maskedSaltedPoint, maskedPoint.mask);
                    saltedPointIsValid = oprf.isValidPoint(saltedPoint);
                    if (saltedPointIsValid) {
                        console.log(green, "Unmasked salted point is valid.");
                        console.log("Unmasked salted point (UTF-8):");
                        console.log(blue, oprf.encodePoint(saltedPoint, 'hex'));
                        console.log("OPRF complete.");
                        return saltedPoint;
                    } else {
                        console.error(yellow, "Unmasked salted point is invalid.");
                        console.log("This can happen... Trying again with a newly masked point.");
                    }
                } catch (err: any) {
                    console.error(red, "Error:", err.message, "\nThis should never happen.");
                }
            } else {
                console.error(yellow, "Salted masked point is invalid.");
                console.log("This can happen... Trying again with a newly masked point.");
            }
        } catch (err: any) {
            console.error(yellow, "Error from OPRF server:", err.response ? err.response.data.error : err.message);
            console.log("This can happen… Trying again with a newly masked point.");
            if (!(err.response.status === 400)) {
                return null;
            }
        }
    } while (!(maskedSaltedPointIsValid && saltedPointIsValid));
    return null;
}
module.exports = oprfClient;