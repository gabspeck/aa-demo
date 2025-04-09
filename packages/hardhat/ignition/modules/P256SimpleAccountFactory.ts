import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { toHex } from "viem";

const entryPoint08Address = '0x4337084d9e255ff0702461cf8895ce9e3b5ff108'
export default buildModule("P256SimpleAccountFactory", (m) => {
  const salt = m.getParameter(
    "salt",
    toHex(crypto.getRandomValues(new Uint8Array(32)))
  );
  const factory = m.contract("P256SimpleAccountFactory", [entryPoint08Address, salt]);

  return { factory };
});
