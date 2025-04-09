import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SampleERC20", (m) => {
  const token = m.contract("SampleERC20", []);

  return { token };
}); 