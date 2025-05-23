# Microsoft Login OIDC test program

npm install openid-client express express-session

## Setup and Run the server

Setup with railway or local

## Create a certificates directory

mkdir certs
cd certs

## Generate private key

openssl genrsa -out key.pem 2048

## Generate certificate

openssl req -new -x509 -key key.pem -out cert.pem -days 365

* When prompted, you can use these values:
* Country: US
* State: Your State
* City: Your City
* Organization: Development
* Unit: IT
* Common Name: localhost (IMPORTANT!)
* Email: <your@email.com>

## Recommend Using MkCert

## Install mkcert (macOS)

brew install mkcert

## Create and install CA

mkcert -install

## Generate certificates

mkcert localhost
