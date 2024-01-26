import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import base64url from 'base64url';
const OPRF = require('oprf');
// Initialize the OPRF instance without a secret key
let oprfInstance = new OPRF();
const dynamoDB = new DynamoDB.DocumentClient();
// name of the DynamoDB table for user IDs and secret keys
const TABLE_NAME = 'oprf-users';
const id_max_length = 32;

// validate the user ID
function isValidId(id: string) {
    // Check if id is a string 
    if (!(typeof id === 'string')) {
        return false;
    }
    // Check if id is length <= id_max_length
    if (id.length > id_max_length) {
        return false;
    }
    // Check if id only contains printable ASCII characters
    return /^[ -~]+$/.test(id);
}
// Check if input is a valid UTF-8 string of length 16
function isValidUtf8Input(input: string): boolean {
    // Check if input is a string 
    if (!(typeof input === 'string')) {
        return false;
    }
    // Check if input is length 16
    if (!(input.length === 16)) {
        return false;
    }
    // check if input is valid UTF-8
    try {
        const buffer = Buffer.from(input, 'utf8');
        return buffer.toString('utf8') === input;
    } catch (err) {
        return false;
    }
}
// Check if input is a valid base64url encoded string of length 60-64
function isValidBase64UrlInput(input: string): boolean {
    // Check if input is a string 
    if (!(typeof input === 'string')) {
        return false;
    }
    // Check if input is valid base64url
    const base64urlPattern = /^[A-Za-z0-9_-]{60,64}$/;
    if (base64urlPattern.test(input)) {
       return true;
    }
    return false;
}
// Check if input is a valid hex encoded string of length 90-96
function isValidHexInput(input: string): boolean {
    // Check if input is a string 
    if (!(typeof input === 'string')) {
        return false;
    }
    // Check if input is valid hex
    const hexPattern = /^[A-Fa-f0-9]{90,96}$/;
    if (hexPattern.test(input)) {
        return true;
    }
    return false;
}
// Convert base64url to UTF-8
function base64urlToUtf8(input: string): string {
    // Convert base64url to buffer
    const buffer = base64url.toBuffer(input);
    // Convert buffer to UTF-8
    return buffer.toString('utf8');
}
// Convert UTF-8 to base64url
function utf8ToBase64url(input: string): string {
    // Convert UTF-8 to buffer
    const buffer = Buffer.from(input, 'utf8');
    // Convert buffer to base64url
    return base64url(buffer);
}
// Convert hex to UTF-8
function hexToUtf8(input: string): string {
    // Convert hex to buffer
    const buffer = Buffer.from(input, 'hex');
    // Convert buffer to UTF-8
    return buffer.toString('utf8');
}
// Convert UTF-8 to hex
function utf8ToHex(input: string): string {
    // Convert UTF-8 to buffer
    const buffer = Buffer.from(input, 'utf8');
    // Convert buffer to hex
    return buffer.toString('hex');
}
export const handler: APIGatewayProxyHandler = async (event) => {
    // Introduce a delay to ensure consistent response times, 1000 (ms) = 1 second
    const timeout = new Promise(resolve => setTimeout(resolve, 1000));
    let id, input;
    const parsedBody = event.body ? JSON.parse(event.body) : {};
    // parse GET parameters
    const getParams = event.queryStringParameters;
    // if both GET and POST parameters are empty, return an informative error message about the required input and this Lambda function
    if (!getParams && !parsedBody.input) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Welcome! This project is based on the OPRF implementation of multiparty/oprf. \
            To use this Lambda function, provide a masked point in UTF-8, Base64Url or Hex format as "input".\
            Optionally, provide an ID as "id" to use the same secret key (equal OPRF evaluation) for multiple requests.\
            More information about multiparty/oprf can be found at github.com/multiparty/oprf.' }),
        };
    }
    id = getParams? getParams.id : parsedBody.id;
    input = getParams? getParams.input : parsedBody.input;
    // Check if input are provided
    if (!input) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'A masked point in UTF-8, Base64Url or Hex format is required as "input".' }),
        };
    }
    if (id && !isValidId(id)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid ID format.' })
        };
    }
    const inputIsUtf8 = isValidUtf8Input(input);
    const inputIsBase64Url = isValidBase64UrlInput(input);
    const inputIsHex = isValidHexInput(input);
    if (!inputIsUtf8 && !inputIsBase64Url && !inputIsHex) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid input format. Input length:' + input.length })
        };
    }
    // Input is a masked point and has to be convert to UTF-8, if it is not already
    const encodedMaskedPoint = inputIsBase64Url? base64urlToUtf8(input) 
                             : inputIsHex? hexToUtf8(input) 
                             : input;
    // In case no ID is provided, generate a random ID
    // In case an ID is provided, try to fetch its secret key from DynamoDB
    let providedIdExists = false;
    let secretKey = Uint8Array.from([]);
    if (id) {
        // Check if the provided ID already exists in DynamoDB
        const result = await dynamoDB.get({
            TableName: TABLE_NAME,
            Key: { id }
        }).promise();
        // If the provided ID already exists, use the secret key of that ID
        if (result.Item) {
            providedIdExists = true;
            // Convert the secret key from a binary attribute to a Uint8Array
            secretKey = new Uint8Array(result.Item.secretKey);
        }
    } else {
        // Generate a random ID and check if it already exists in DynamoDB
        let result: DynamoDB.DocumentClient.GetItemOutput;
        let randomIdExists: string;
        do {
            // Generate a random ID
            const idLength = 16;
            const idBuffer = Buffer.alloc(idLength);
            for (let i = 0; i < idLength; i++) {
                idBuffer[i] = Math.floor(Math.random() * 256);
            }
            id = idBuffer.toString('base64');
            // Check if the random ID already exists in DynamoDB
            result = await dynamoDB.get({
                TableName: TABLE_NAME,
                Key: { id }
            }).promise();
            randomIdExists = result.Item?.id;
        } while (randomIdExists);
    }
    // Generate a random secret key for the newly provided or random ID
    if (!providedIdExists) {
        // Generate a random scalar as new secret key 
        secretKey = oprfInstance.generateRandomScalar();
        // Store ID and secret key in DynamoDB
        await dynamoDB.put({
            TableName: TABLE_NAME,
            // Store the secret key as a binary attribute
            Item: { id, secretKey: Array.from(secretKey) }  
        }).promise();
    }
    // wait for dependencies (libsodium) to load
    await oprfInstance.ready;
    // Decode the encoded masked point (input) to a point on the curve
    let maskedPoint: Uint8Array;
    try {
        maskedPoint = oprfInstance.decodePoint(encodedMaskedPoint, 'UTF-8');
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Decoding the mask point has failed' })
        };
    }
    // Check if the masked point is a valid point on the curve
    if (!(oprfInstance.isValidPoint(maskedPoint))) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Masked point is not a valid point on the curve' })
        };
    }
    // Compute salted point using scalar multiplication of masked point with secret key
    let saltedPoint: Uint8Array;
    try {
        saltedPoint = oprfInstance.scalarMult(maskedPoint, secretKey);
    } catch (err) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Scalar multiplication failed. This shouldn\'t have happened!' })
        };
    }
    // Check if the salted point is a valid point on the curve
    if (!(oprfInstance.isValidPoint(saltedPoint))) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Salted point is not a valid point on the curve' })
        };
    }
    // Encode the salted point as an UTF-8 string
    const encodedSaltedPoint = oprfInstance.encodePoint(saltedPoint, 'UTF-8');
    // Encode the salted point as base64url or hex (same format as the input)
    const output = inputIsBase64Url? base64url(encodedSaltedPoint) 
                 : inputIsHex? utf8ToHex(encodedSaltedPoint) 
                 : encodedSaltedPoint;
    // wait til the timeout is over
    await timeout;
    // Return the salted point as the response
    return {
        statusCode: 200,
        body: JSON.stringify({ id: id, output: output }),
    };
};