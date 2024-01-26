# Serverless OPRF Service

Welcome to my prototype project towards a "Serverless OPRF Service", showcasing an implementation of a self-hosted Oblivious Pseudo-Random Function (OPRF) service. 
It's designed as a prototype to demonstrate how OPRF services can be deployed as a "cloud infrastructure" or "free web" service.

## About This Project

This project is based on Chapter 5 of my master's thesis, which involves the implementation of a serverless OPRF service.
I chose the AWS Lambda platform, taking advantage of its serverless capabilities as well as API Gateway features to provide a scalable, efficient and tunable service.

The core (OPRF) functionality is based on the multiparty/oprf repo.
It's in TypeScript, offering a robust and type-safe experience for developers. 
The service interacts with AWS DynamoDB for storing client IDs and secret keys, ensuring a secure and scalable database solution.

## Key Features
* OPRF Protocol: Implements an OPRF protocol, providing a secure method for "remote salted hashing" (without revealing client inputs).
* TypeScript Implementation: Ensures robust and type-safe code.
* Serverless Architecture: Deployed on AWS Lambda for scalability and efficiency.
* AWS DynamoDB Integration: Utilizes DynamoDB for secure and scalable data storage.

## Project Files

### oprfServerless.ts

This TypeScript file contains the server-side logic for the OPRF service. It's designed to be deployed on AWS Lambda and handles requests through the API Gateway. The file includes functions for setting up the OPRF protocol, processing client requests, and interacting with DynamoDB for storing and retrieving data.

### oprfClient.ts

The oprfClient.ts file is a TypeScript-based client-side script. It outlines how clients can interact with the OPRF service. This includes the generation of client requests, processing of server responses, and ensuring that the communication adheres to the OPRF protocol specifications. It's an essential resource for developers looking to integrate OPRF functionality into their applications.

### oprfClientDemo.js

oprfClientDemo.js is a JavaScript demo script that provides a practical example of how the OPRF client operates. Users can run this script to interact with the OPRF service, witnessing firsthand the process of "remote salted hashing" in a real-world scenario. The script is user-friendly and serves as an excellent starting point for understanding the client-side functionalities of the OPRF service.

### Try It Out
I invite you to test and use my instance of the Serverless OPRF Service at oprf.reich.org. This live demonstration will give you a hands-on experience with the service, showcasing its capabilities and ease of use. Feel free to explore the functionality and see how it can be integrated into various applications.
