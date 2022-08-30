import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.flights = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            for (let i=0; i<5; i++) {
                this.flights.push({name: 'Flight-'+i, airline: this.airlines[0], airlineName: "AirFirst",timestamp: Math.floor(Date.now() / 1000)});
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: flight.airline,
            flight: flight.name,
            timestamp: flight.timestamp
        }

        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    buyInsurance(flight, insuredAmount, callback) {
        let self = this;
        let payload = {
            airline: flight.airline,
            flight: flight.name,
            timestamp: flight.timestamp
        }

        console.log("payload", JSON.stringify(payload));
        self.flightSuretyData.methods
            .buy(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.passengers[1], value: this.web3.utils.toWei(insuredAmount, 'Wei'), gas: 6721975}, (error, result) => {
                console.log(result);
                callback(error, payload);
            });
    }


}