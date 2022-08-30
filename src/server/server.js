import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const ORACLE_COUNT = 10;
const STATUS_CODES = [0, 10, 20, 30, 40, 50];

let oracles = new Map(); // Storing Oracles and its indexes in memory;

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) {
      console.log("Error occurred while receiving OracleRequest ", error);
    }
    // console.log("OracleRequest Received : ",event);
    submitOracleResponses(event.returnValues);
});

let submitOracleResponses = async(request) => {
  console.log('OracleRequest -> {index : %d, airline : %s, flight : %s, timestamp : %d }', request.index, request.airline, request.flight, request.timestamp);

  oracles.forEach(async function(indexes, address) {
    indexes.forEach(async function(index) {

      if (index == request.index) {
        let status = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];
        try {
  
          await flightSuretyApp.methods.submitOracleResponse(index, request.airline, request.flight, request.timestamp, status).send({from: address});
  
          console.log("Successfully Sent Response with index : %d, airline : %s, flight : %s, timestamp : %d, status : %d", index, request.airline, request.flight, request.timestamp, status);
        } catch(e) {
          console.log("An Error Occurred while sending the response with index : %d, airline : %s, flight : %s, timestamp : %d, status : %d",index, request.airline, request.flight, request.timestamp, status, e);
        }
      }
    })
  });
}


let registerOracles = async() => {

  let accounts = await web3.eth.getAccounts();
  let oracleAccountList = accounts.slice(ORACLE_COUNT * -1); // Fetch Last N number of accounts.

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call(); // Get Registration Fee.

  oracleAccountList.forEach(async function(oracleAccount) {
    await flightSuretyApp.methods.registerOracle().send({from: oracleAccount, value: fee, gas: 6721975});
    let indexes = await flightSuretyApp.methods.getMyIndexes().call({from: oracleAccount});
    oracles.set(oracleAccount, indexes);// Persist Oracles in Map.
    console.log("Oracles Created " + oracleAccount + " : " + indexes);
  });
}

// Only for testing.
let fetchFlightState = async() => {

  let accounts = await web3.eth.getAccounts();
  let timestamp = Math.floor(Date.now() / 1000);

  await flightSuretyApp.methods.fetchFlightStatus(accounts[2], "TestFlight", timestamp).send({from: accounts[3]});
}

// Setup Environment.
(async() => {
  await registerOracles();
  //await fetchFlightState();
})();

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


