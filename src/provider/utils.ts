/* eslint-disable max-classes-per-file */
import { BN } from 'bn.js';

import type { BlockNumber, SequencerIdentifier } from '../types';
import { BigNumberish, isHex, toBN, toHex } from '../utils/number';

/**
 *
 * [Reference](https://github.com/starkware-libs/cairo-lang/blob/fc97bdd8322a7df043c87c371634b26c15ed6cee/src/starkware/starknet/services/api/feeder_gateway/feeder_gateway_client.py#L148-L153)
 *
 * @param hashValue
 * @param hashField
 */
export function formatHash(hashValue: BigNumberish): string {
  if (typeof hashValue === 'string') return hashValue;
  return toHex(toBN(hashValue));
}

/**
 *
 * [Reference](https://github.com/starkware-libs/cairo-lang/blob/fc97bdd8322a7df043c87c371634b26c15ed6cee/src/starkware/starknet/services/api/feeder_gateway/feeder_gateway_client.py#L156-L161)
 * @param txHash
 * @param txId
 */
export function txIdentifier(txHash?: BigNumberish, txId?: BigNumberish): string {
  if (!txHash) {
    return `transactionId=${JSON.stringify(txId)}`;
  }
  const hashString = formatHash(txHash);

  return `transactionHash=${hashString}`;
}

// hex string and BN are detected as block hashes
// decimal string and number are detected as block numbers
// null appends nothing to the request url

export type BlockIdentifier = BlockNumber | BigNumberish;
export const validBlockTags = ['latest', 'pending'];

export class Block {
  hash: BlockIdentifier = null;

  number: BlockIdentifier = null;

  tag: BlockIdentifier = null;

  private setIdentifier(__identifier: BlockIdentifier) {
    if (typeof __identifier === 'string' && isHex(__identifier)) {
      this.hash = __identifier;
    } else if (BN.isBN(__identifier)) {
      this.hash = toHex(__identifier);
    } else if (typeof __identifier === 'number') {
      this.number = __identifier;
    } else if (typeof __identifier === 'string' && validBlockTags.includes(__identifier)) {
      this.tag = __identifier;
    } else {
      // default
      this.tag = 'pending';
    }
  }

  constructor(_identifier: BlockIdentifier) {
    this.setIdentifier(_identifier);
  }

  // TODO: fix any
  get queryIdentifier(): any {
    if (this.number !== null) {
      return `blockNumber=${this.number}`;
    }

    if (this.hash !== null) {
      return `blockHash=${this.hash}`;
    }

    return `blockNumber=${this.tag}`;
  }

  // TODO: fix any
  get identifier(): any {
    if (this.number !== null) {
      return { block_number: this.number };
    }

    if (this.hash !== null) {
      return { block_hash: this.hash };
    }

    return this.tag;
  }

  set identifier(_identifier: BlockIdentifier) {
    this.setIdentifier(_identifier);
  }

  valueOf = () => this.number;

  toString = () => this.hash;

  get sequencerIdentifier(): SequencerIdentifier {
    return this.hash !== null
      ? { blockHash: this.hash as string }
      : { blockNumber: (this.number ?? this.tag) as BlockNumber };
  }
}
