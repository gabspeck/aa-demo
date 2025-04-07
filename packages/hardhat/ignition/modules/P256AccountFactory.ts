import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { toHex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";

export default buildModule("P256AccountFactory", (m) => {
  const salt = m.getParameter(
    "salt",
    toHex(crypto.getRandomValues(new Uint8Array(32)))
  );
  const factory = m.contract("P256AccountFactory", [entryPoint07Address, salt]);

  return { factory };
});
