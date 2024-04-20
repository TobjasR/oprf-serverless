# sudo docker run -it ubuntu

apt update && apt install git curl -y 
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install nodejs -y  
npm install -g axios base64url oprf ts-node typescript '@types/node'
git clone https://github.com/tobjasr/oprf-serverless
cd oprf-serverless/
npm install --save-dev @types/node
npm install axios base64url oprf
tsc oprfClient.ts 

node oprfClientDemo.js
