const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');
var BigNumber = require('bignumber.js');
const web3 = require('web3');

module.exports = function(deployer, network, accounts) {

    // First airline is registered when FlightSuretyData contract is deployed.
    let firstAirlineAddress = accounts[1];
    let firstAirlineName = "AirFirst";
    deployer.deploy(FlightSuretyData, firstAirlineName, firstAirlineAddress, {from: accounts[0]})
    .then(() => {
        return deployer.deploy(FlightSuretyApp, FlightSuretyData.address, {from: accounts[0]})
                .then(async () => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:7545',
                            dataAddress: FlightSuretyData.address,
                            appAddress: FlightSuretyApp.address
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');

                    // Authorize FlightSuretyApp Contract address to make call in FlightSuretyData contract.
                    flightSuretyData = await FlightSuretyData.deployed();
                    flightSuretyData.authorizeCaller(FlightSuretyApp.address, {from: accounts[0]});

                    // Submits funding of 10 ether for first airline so that it can contribute in registering other airlines.
                    flightSuretyData.fund({from: firstAirlineAddress, value: web3.utils.toWei('10', 'ether')})
                });
    });
}