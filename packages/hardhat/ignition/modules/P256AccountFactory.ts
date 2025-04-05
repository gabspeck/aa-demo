import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ENTRYPOINT_V08_ADDRESS = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108'

export default buildModule("P256AccountFactory", (m) => {
  const token = m.contract("P256AccountFactory", [ENTRYPOINT_V08_ADDRESS]);

  return { token };
});
