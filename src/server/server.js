import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const ORACLE_COUNT = 10;

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;
const STATUS_CODES = [STATUS_CODE_UNKNOWN, STATUS_CODE_ON_TIME, STATUS_CODE_LATE_AIRLINE, STATUS_CODE_LATE_WEATHER, STATUS_CODE_LATE_TECHNICAL, STATUS_CODE_LATE_OTHER];

let oracles = new Map();

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) {
      console.log(error)
    }
    console.log(event)
    submitFlightResponse(event.returnValues);
});

let registerOracles = async() => {
  let accounts = await web3.eth.getAccounts();
  accounts = accounts.slice(ORACLE_COUNT * -1);

  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();

  for(let i=0; i<ORACLE_COUNT; i++) {
    await flightSuretyApp.methods.registerOracle().send({from: accounts[i], value: fee, gas: 6721975});
    let indexes = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]});
    oracles.set(accounts[i], indexes);
  }

  oracles.forEach(function(value, key) {
    console.log("Oracles Created " + key + " : " + value);
  });
}

let submitFlightResponse = async(request) => {
  console.log('Request ', [request.index, request.airline, request.flight, request.timestamp]);
  oracles.forEach(async function(indexes, address) {
    console.log("Oracles Used " + address + " : " + indexes);
    indexes.forEach(async function(index) {
      let status = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];
      try {

        await flightSuretyApp.methods.submitOracleResponse(index, request.airline, request.flight, request.timestamp, status).send({from: address});

        console.log(" Success ", address, index);
      } catch(e) {
        console.log(" Error ", address, index, e);
      }
    })
  });
}

// Only for testing.
let fetchFlightState = async() => {

  let accounts = await web3.eth.getAccounts();
  let timestamp = Math.floor(Date.now() / 1000);

  await flightSuretyApp.methods.fetchFlightStatus(accounts[2], "TestFlight", timestamp).send({from: accounts[3]});
}

(async() => {
  await registerOracles();
  await fetchFlightState();
})();

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


