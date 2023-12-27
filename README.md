## Description

Backend base repository.

## Installation

```bash
$ npm install
```

## Setup
1. Create .env file using env.example

Note: Please set prod-api, prod-worker to NODE_ENV, it'll require KMS service to encrypt and decrypt the private key.

```bash
PORT=3001 # API port

NODE_ENV=dev-worker # dev-api, dev-worker, prod-api, prod-worker

SECRET_KEY=somesercretkey # your secret key, anything is ok

# notification
MAIL_HOST=smtp.gmail.com
MAIL_USER= # gmail account
MAIL_PASS= # gmail application key
MAIL_RECEIVED_ADDRESS= # email address that you want to receive the notification
TELEGRAM_TOKEN= # telegram bot token
TELEGRAM_CHAT_ID= # teleram chat id

# TYPEORM
TYPEORM_CONNECTION=mysql
TYPEORM_HOST=localhost # MySQL host
TYPEORM_PORT=3306 # MySQL port
TYPEORM_USERNAME=root # MySQL username
TYPEORM_PASSWORD=1 # MySQL password
TYPEORM_DATABASE=database_name # schema name
TYPEORM_MIGRATIONS_DIR=src/database/migrations
TYPEORM_MIGRATIONS=dist/database/migrations/*.js
TYPEORM_ENTITIES_DIR=dist/**/*.entity.js

# BLOCK REQUEST
LIMIT_REQUEST=5
LIMIT_HOURS_BLOCK_REQUEST=4

# CONFIG URL
URL_FRONTEND=
URL_BACKEND=
URL_API=
```

2. Create database structure.

Run the app for the first time to create the database structure.

3. Setup currency config

3. Setup Key Management Service (KMS)

a. Create a Customer managed keys on  AWS KMS

b. Add current EC2 instance role to Key users on Customer managed keys

c. Insert KMS information record. Example:

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

## License

This project is under [MIT licensed](LICENSE).

## Gen SSL
You need to generate sslcert with your domain and replace sslcert folder.



