const oprfClient = require('./oprfClient.js');

const green = "\x1b[32m%s\x1b[0m";
const red = "\x1b[31m%s\x1b[0m";
const blue = "\x1b[34m%s\x1b[0m";

const oprfServer = "oprf.reich.org";
const oprfURL = "https://" + oprfServer;
const oprfID = "4lphaNumT3stId1234";
const password = "password123";
const encoding = "base64url";
let passseed;
async function run() {
    try {
        console.log(`Trying to execute oprfClient("${oprfURL}", "${oprfID}", "${password}", "${encoding}") ...`);
        passseed = await oprfClient(oprfURL, oprfID, password, encoding);
        console.log(green, "oprfClient() executed successfully.");
        console.log("Your OPRF-salted 256 bit password hash (hex) is:");
        console.log(blue, Buffer.from(passseed).toString('hex'));
        console.log("You can now use this secretly salted password hash as a seed (passseed) for whatever you want to do with it.");
        console.log(green, `${oprfServer} will store your client ID (${oprfID}) `
                     + "together with the (randomly selected) secret salt key for future requests.");
        console.log("Note:  same password  +  same client ID  =  same passseed   (Well, most of the times).");
    } catch (error) {
        console.error(red, "An error occurred:", error);
    }
}
run();
