var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "this typical tunnel front way trial detect rifle nurse aunt silver pepper";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*'
    }
  },
  compilers: {
    solc: {
      version: "0.5.16"
    }
  }
};