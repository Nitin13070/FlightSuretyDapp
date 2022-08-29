
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const web3 = require('web3');

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
    assert.equal(result, true, "Airline2 is not registered");

    await config.flightSuretyApp.registerAirline("Airline3", newAirline3, {from: config.firstAirline});
    result = await config.flightSuretyData.isAirline.call(newAirline3);
    assert.equal(result, true, "Airline3 is not registered");

    await config.flightSuretyApp.registerAirline("Airline4", newAirline4, {from: config.firstAirline});
    result = await config.flightSuretyData.isAirline.call(newAirline4);
    assert.equal(result, true, "Airline4 is not registered");

    let newAirline5 = accounts[5];
    try {
        await config.flightSuretyApp.registerAirline("Airline5", newAirline5, {from: config.firstAirline});
        assert.fail("Registering 5th Airline must not be successfull because it multi-party consensus of 50% ");
    } catch(e) {}

    result = await config.flightSuretyData.isAirline.call(newAirline5);
    assert.equal(result, false, "Airline5 is registered");
  })

  it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async() => {
    let newAirline2 = accounts[2];
    let newAirline5 = accounts[5];

    // Make 2nd Airline Operational by funding 10 ether.
    await config.flightSuretyData.fund({from: newAirline2, value: web3.utils.toWei('10', 'ether')});
    let result = await config.flightSuretyData.isAirlineOperational.call(newAirline2);
    assert.equal(result, true, "Airline2 is not Operational"); 

    await config.flightSuretyApp.registerAirline("Airline5", newAirline5, {from: newAirline2});

    result = await config.flightSuretyData.isAirline.call(newAirline5);
    assert.equal(result, true, "Airline5 is not registered");
  })

});
