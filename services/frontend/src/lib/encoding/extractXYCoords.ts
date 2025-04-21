import { type Hex, toHex } from 'viem';

export function extractXYCoords(key: Uint8Array | Hex): { x: Hex; y: Hex } {
	if (key instanceof Uint8Array) {
		key = toHex(key.slice(-64), { size: 64 });
	}
	return { x: `0x${key.slice(-128, -64)}`, y: `0x${key.slice(-64)}` };
}
