pragma solidity >= 0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    
    bool private operational;                                    // Blocks all state changes throughout the contract if false
    
    mapping(address => bool) private authorizedCallerMap;

    struct Airline {
        string name;
        bool isOperational;
        bool flag;
    }

    mapping(address => Airline) private airlines;

    uint256 private registeredAirlineCount;

    struct Insurance {
        address insuree;
        uint256 amount;
    }

    mapping(bytes32 => Insurance[]) private insuranceBought;

    mapping(address => uint256) private insureeBalance;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(string memory airlineName, address airlineAddress) public {
        contractOwner = msg.sender;
        operational = true;
        airlines[airlineAddress] = Airline({name: airlineName, isOperational: false, flag: true});
        airlines[airlineAddress].flag = true;
        registeredAirlineCount = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAuthorizedCaller() {
        require(authorizedCallerMap[msg.sender], "Caller is not authorized.");
        _;
    }

    modifier requireAmountLimit(uint256 amount) {
        require(msg.value <= amount, "flight insurance amount cannot be more than 1 ether");
        _;
    }

    modifier requireAirlineOperational(address airlineAddress) {
        require(isAirlineOperational(airlineAddress), "Airline is not Operational.");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) requireContractOwner external {
        operational = mode;
    }

    function authorizeCaller( address appContract ) requireContractOwner requireIsOperational external {
        authorizedCallerMap[appContract] = true;
    }

    function deauthorizeCaller( address appContract ) requireContractOwner requireIsOperational external {
        delete authorizedCallerMap[appContract];
    }

    // Function that allows you to convert an address into a payable address
    function _make_payable(address x) private pure returns (address payable) {
        return address(uint160(x));
    }

      // Define a function 'kill' if required
    function kill() requireContractOwner public {
        address payable ownerAddress = _make_payable(contractOwner);
        selfdestruct(ownerAddress);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(string calldata airlineName, address airlineAddress) requireIsOperational requireAuthorizedCaller external {
        airlines[airlineAddress] = Airline({name: airlineName, isOperational: false, flag: true});
        registeredAirlineCount = registeredAirlineCount.add(1);
    }

    function getRegisteredAirlineCount() external view returns(uint256) {
        return registeredAirlineCount;
    }

    function isAirline(address airlineAddress) external view returns(bool) {
        return airlines[airlineAddress].flag;
    }

    function isAirlineOperational(address airlineAddress) public view returns(bool) {
        return airlines[airlineAddress].isOperational;
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy (address airline, string calldata flight, uint256 timestamp)   
                                                                            requireIsOperational 
                                                                            requireAirlineOperational(airline) 
                                                                            requireAmountLimit(1 ether) 
                                                                            external payable {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        insuranceBought[key].push(Insurance(msg.sender, msg.value));
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(address airline, string calldata flight, uint256 timestamp, uint256 divFactor) 
                                                                                                        requireIsOperational
                                                                                                        requireAuthorizedCaller 
                                                                                                        requireAirlineOperational(airline) 
                                                                                                        external {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        Insurance[] memory insureeList = insuranceBought[key];

        for (uint i=0; i < insureeList.length; i++) {
            uint256 creditAmount = insureeList[i].amount.add(insureeList[i].amount.div(divFactor)); // InsuranceAmount + (InsuranceAmount/2) = 1.5x of InsuranceAmount
            insureeBalance[insureeList[i].insuree] = insureeBalance[insureeList[i].insuree].add(creditAmount);
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay () requireIsOperational external
    {
        uint256 amountToPay = insureeBalance[msg.sender];
        require(amountToPay != 0, "Zero Balance, No amount to be paid.");

        insureeBalance[msg.sender] = 0;

        _make_payable(msg.sender).transfer(amountToPay);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund() requireIsOperational public payable {
        if (bytes(airlines[msg.sender].name).length  != 0) {
            require(msg.value >= 10 ether, "Insufficient Funds for Airline participation.");
            airlines[msg.sender].isOperational = true;
        }
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() external payable {
        require(msg.data.length == 0, "Invalid function call");
        fund();
    }


}

