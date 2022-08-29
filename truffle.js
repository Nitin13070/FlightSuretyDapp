var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "inner puppy alter rose initial enforce item card history brisk indicate old";

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