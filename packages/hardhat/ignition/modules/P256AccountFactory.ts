import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ENTRYPOINT_V07_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032'

export default buildModule("P256AccountFactory", (m) => {
  const factory = m.contract("P256AccountFactory", [ENTRYPOINT_V08_ADDRESS]);

  return { factory };
});
