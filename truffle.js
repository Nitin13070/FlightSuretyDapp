var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "draft advance drill dinosaur patch vehicle trip skin sick relax end advance";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*'
    }
  },
  contracts_directory: './contracts/',
  contracts_build_directory: './build/contracts/',
  compilers: {
    solc: {
      version: "0.5.16"
    }
  }
};