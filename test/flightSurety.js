
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyData.fund({value: 10});
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it("Only existing airline may register a new airline until there are at least four airlines registered", async () => {
    
    // Make First Airline Operational by funding 10 ether.
    await config.flightSuretyData.fund({from: config.firstAirline, value: web3.utils.toWei('10', 'ether')})
    var result = await config.flightSuretyData.isAirlineOperational.call(config.firstAirline);
    assert.equal(result, true, "firstAirline is not Operational");    

    let newAirline2 = accounts[2];
    let newAirline3 = accounts[3];
    let newAirline4 = accounts[4];

    await config.flightSuretyApp.registerAirline("Airline2", newAirline2, {from: config.firstAirline});
    result = await config.flightSuretyData.isAirline.call(newAirline2);
    assert.equal(result, true, "Airline2 must be registered");

    await config.flightSuretyApp.registerAirline("Airline3", newAirline3, {from: config.firstAirline});
    result = await config.flightSuretyData.isAirline.call(newAirline3);
    assert.equal(result, true, "Airline3 must be registered");

    await config.flightSuretyApp.registerAirline("Airline4", newAirline4, {from: config.firstAirline});
    result = await config.flightSuretyData.isAirline.call(newAirline4);
    assert.equal(result, true, "Airline4 must be registered");

    let newAirline5 = accounts[5];
    
    await config.flightSuretyApp.registerAirline("Airline5", newAirline5, {from: config.firstAirline});
    result = await config.flightSuretyData.isAirline.call(newAirline5);
    assert.equal(result, false, "Airline5 must not be registered");
  })

  it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async() => {
    let newAirline2 = accounts[2];
    let newAirline5 = accounts[5];

    // Make 2nd Airline Operational by funding 10 ether. So that 'newAirline2' can also vote for 'Airline5'.
    await config.flightSuretyData.fund({from: newAirline2, value: web3.utils.toWei('10', 'ether')});
    let result = await config.flightSuretyData.isAirlineOperational.call(newAirline2);
    assert.equal(result, true, "Airline2 is not Operational"); 

    // Since 4 airlines are registered and 'Airline5' will be registered by 2 airlines after below transaction.
    await config.flightSuretyApp.registerAirline("Airline5", newAirline5, {from: newAirline2});

    result = await config.flightSuretyData.isAirline.call(newAirline5);
    assert.equal(result, true, "Airline5 is not registered");
  })

  it("Passengers may pay up to 1 ether for purchasing flight insurance", async() => {

    let passenger = accounts[6];
    let passenger1 = accounts[7];
    let flightName = "Flight-1";
    let timestamp = Math.floor(Date.now() / 1000);

    let isReverted = false;

    await config.flightSuretyData.buy(config.firstAirline, flightName, timestamp, {from: passenger, value: 1000});

    try {
      await config.flightSuretyData.buy(config.firstAirline, flightName, timestamp, {from: passenger1, value: web3.utils.toWei('2', 'ether')});
    } catch(e) {
      isReverted = true;
    }
    assert.equal(isReverted, true, "Passenger cannot buy insurance for more than 1 ether.");
  })

  it("Passenger can widraw their funds after flight is delayed", async() => {
    let passenger = accounts[7];
    let flightName = "Flight-1";
    let timestamp = Math.floor(Date.now() / 1000);

    await config.flightSuretyData.buy(config.firstAirline, flightName, timestamp, {from: passenger, value: web3.utils.toWei('1', 'ether')});

    await config.flightSuretyData.authorizeCaller(config.owner); // Only for calling Data Contract.
    
    await config.flightSuretyData.creditInsurees(config.firstAirline, flightName, timestamp, 2);

    let prevBalance = BigNumber(await web3.eth.getBalance(passenger));

    let transaction = await config.flightSuretyData.pay({from: passenger});

    let gasPrice = BigNumber(await web3.eth.getGasPrice());
    let txGasFee =  BigNumber(transaction.receipt.gasUsed * gasPrice);
    let payoutAmount = BigNumber(web3.utils.toWei('1.5', 'ether'));
    let afterBalance = BigNumber(await web3.eth.getBalance(passenger));
    let expectedBalance = prevBalance.minus(txGasFee).plus(payoutAmount);

    assert.equal(expectedBalance.isEqualTo(afterBalance), true, "Amount is not credited to Passenger");
  })
});
