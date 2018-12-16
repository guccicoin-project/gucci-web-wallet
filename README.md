# 👛 Guccicoin Web Wallet
A web wallet for Guccicoin made with Node.js, Express and the Turtlecoin RPC API.

**There is a public deployment of this at https://webwallet.guccicoin.cf.**

## Deployment
```
yarn install
node index.js
```

### Environment Variables
```
AUTH0_DOMAIN
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
SESSION_SECRET
TOKEN_SECRET
MYSQL_HOST
MYSQL_DATABASE
MYSQL_USER
MYSQL_PASSWORD
DAEMON_HOST
SERVICE_HOST
SERVICE_PASSWORD
```

## API
<details>
<summary><b>API Documentation</b></summary>
If you have an account on the web wallet, you can use the API to programatically send and receive funds.

### Setup
1. Go to [the settings page](https://webwallet.guccicoin.cf/settings) for your account.
2. Hit 'Enable API`
3. You'll be redirected to `/api/status` where you'll get a JSON object like this:
```json
{
    "ok": true,
    "enabled": true,
    "key": "xyz"
}
```
4. Double check that `ok` is equal to `true` and that `enabled` is also `true`. You can then copy the string `key` (in this case it would be `xyz`).

For the majority of deplyoments, the API base will be at `https://example.com/api/`. **If you want to use the public deployment use `https://webwallet.guccicoin.cf/api` for the API base.**

### Failure Response
```json
{
  "ok": false,
  "error": "There was a problem verifying the API key."
}
```
For all failure responses, `ok` will always be false and the `error` can be shown to the user.

### *GET* `/hello`
#### Request
##### Headers
```
Authorization: <YOURAPIKEY>
```
#### Response
```json
{
  "ok": true,
  "hello": "world"
}
```

### *GET* `/info`
#### Request
##### Headers
```
Authorization: <YOURAPIKEY>
```
#### Response
```json
{
  "ok": true,
  "address": "gucci3VWY73cLX6cYX6YhjDzRUVEEzpfE29UaN7U1rH4iqqBnwcLvqk1sjsKXcaQXVcmRWefrvFF7VUqRoaD1CMLMZQZFgm3nEJ1Y",
  "balance": {
    "availableBalance": 10000128.7,
    "lockedAmount": 999950.8
  }
}
```

### *GET* `/transactions`
#### Request
##### Headers
```
Authorization: <YOURAPIKEY>
```
##### URL Parameters
*These URL parameters are optional.*
* `id` - The payment ID to filter for.
```
id: 5d60ffd9543bc08e760026fb1e63c4baf665522c38b6e47f326d8994cfea3852
```
#### Response
```json
{
  "ok": true,
  "targeted": true,
  "transactions": [
    {
      "blockHash": "09307cb03ac5ce3e7a45f98660102c215bfe2247fbfcee2b633ce60c35843ebd",
      "transactionAmount": 99.9,
      "blockIndex": 925,
      "extra": "018b17c80472a4467cd57912709e1ff422398aec1e2e85f865bb082f43733b495e0221005d60ffd9543bc08e760026fb1e63c4baf665522c38b6e47f326d8994cfea3852",
      "fee": 0.1,
      "isBase": false,
      "paymentId": "5d60ffd9543bc08e760026fb1e63c4baf665522c38b6e47f326d8994cfea3852",
      "state": 0,
      "timestamp": 1544359017,
      "transactionHash": "3ae03e7b7b13e3b9246c3b22dba1c2d9785f9ea52f5a01988b27ddaf930fff56",
      "address": "gucci3VWY73cLX6cYX6YhjDzRUVEEzpfE29UaN7U1rH4iqqBnwcLvqk1sjsKXcaQXVcmRWefrvFF7VUqRoaD1CMLMZQZFgm3nEJ1Y",
      "amount": 99.9,
      "type": 0,
      "inbound": true,
      "unlockTime": 0
    }
  ]
}
```
* `targeted` - Whether the results are being filtered by payment ID.

### *POST* `/send`
#### Request
##### Headers
```
Authorization: <YOURAPIKEY>
```
##### Form Data, URL-Encoded or JSON data
* `recipient` - the address to send funds to
* `amount` - amount of guccicoin to send (floats accepted)
* `fee` - amount of guccicoin to use for payment fee
* `paymentid` - payment ID to use for transaction (64 bit hex string)
* `mixin` - mixin number to use (best to start at 0 and work up)
```
recipient: gucci3VA3eMd62N4DXM77M4K9FhPuLjW5VEMNmY8zdoSG8BUStCLsH6ZUK6LKTXrWzHbgLwxkF6oANLkd7NiTawtaBDG3n1P59W1p
amount: 50
fee: 0.1
paymentid: 
mixin: 3
```
#### Response
```json
{
  "ok": true,
  "hash": "77a1016207f77448ef219abdd75457ee2bfdab491dfd1bd356d5d0d38261e5af"
}
```
* `hash` - transaction hash
</details>