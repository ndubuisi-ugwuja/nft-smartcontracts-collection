const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BasicNftModule", (m) => {
    const basicNft = m.contract("BasicNft");
    return { basicNft };
});
