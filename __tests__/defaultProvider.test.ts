import { BlockNumber, GetBlockResponse, LibraryError, Provider, stark } from '../src';
import { toBN } from '../src/utils/number';
import { encodeShortString } from '../src/utils/shortString';
import {
  compiledErc20,
  erc20ClassHash,
  getTestAccount,
  getTestProvider,
  wrongClassHash,
} from './fixtures';

const { compileCalldata } = stark;

const testProvider = new Provider(getTestProvider());

describe('defaultProvider', () => {
  let exampleTransactionHash: string;
  let erc20ContractAddress: string;
  let exampleBlock: GetBlockResponse;
  let exampleBlockNumber: BlockNumber;
  let exampleBlockHash: string;
  const wallet = stark.randomAddress();
  const account = getTestAccount(testProvider);

  beforeAll(async () => {
    expect(testProvider).toBeInstanceOf(Provider);

    const { deploy } = await account.declareDeploy({
      contract: compiledErc20,
      classHash: erc20ClassHash,
      constructorCalldata: [encodeShortString('Token'), encodeShortString('ERC20'), wallet],
    });

    exampleTransactionHash = deploy.transaction_hash;
    erc20ContractAddress = deploy.contract_address;

    exampleBlock = await testProvider.getBlock('latest');
    exampleBlockHash = exampleBlock.block_hash;
    exampleBlockNumber = exampleBlock.block_number;
  });

  describe('endpoints', () => {
    test('declareDeploy()', () => {
      expect(erc20ContractAddress).toBeTruthy();
      expect(exampleTransactionHash).toBeTruthy();
    });

    describe('getBlock', () => {
      test('getBlock(blockIdentifier=latest)', async () => {
        expect(exampleBlock).not.toBeNull();
        const { block_number, timestamp } = exampleBlock;
        expect(typeof block_number).toEqual('number');
        return expect(typeof timestamp).toEqual('number');
      });

      test(`getBlock(blockHash=undefined, blockNumber=${exampleBlockNumber})`, async () => {
        const block = await testProvider.getBlock(exampleBlockNumber);
        expect(block).toHaveProperty('block_hash');
        expect(block).toHaveProperty('parent_hash');
        expect(block).toHaveProperty('block_number');
        expect(block).toHaveProperty('status');
        expect(block).toHaveProperty('new_root');
        expect(block).toHaveProperty('timestamp');
        expect(block).toHaveProperty('transactions');
        expect(Array.isArray(block.transactions)).toBe(true);
      });

      test(`getBlock(blockHash=${exampleBlockHash}, blockNumber=undefined)`, async () => {
        const block = await testProvider.getBlock(exampleBlockHash);
        expect(block).toHaveProperty('block_hash');
        expect(block).toHaveProperty('parent_hash');
        expect(block).toHaveProperty('block_number');
        expect(block).toHaveProperty('status');
        expect(block).toHaveProperty('new_root');
        expect(block).toHaveProperty('timestamp');
        expect(block).toHaveProperty('transactions');
        expect(Array.isArray(block.transactions)).toBe(true);
      });

      test('getBlock() -> { blockNumber }', async () => {
        const block = await testProvider.getBlock('latest');
        return expect(block).toHaveProperty('block_number');
      });

      test(`getStateUpdate(blockHash=${exampleBlockHash}, blockNumber=undefined)`, async () => {
        const stateUpdate = await testProvider.getStateUpdate(exampleBlockHash);
        expect(stateUpdate).toHaveProperty('block_hash');
        expect(stateUpdate.block_hash).toBe(exampleBlockHash);
        expect(stateUpdate).toHaveProperty('new_root');
        expect(stateUpdate).toHaveProperty('old_root');
        expect(stateUpdate).toHaveProperty('state_diff');
      });

      test(`getStateUpdate(blockHash=undefined, blockNumber=${exampleBlockNumber})`, async () => {
        const stateUpdate = await testProvider.getStateUpdate(exampleBlockNumber);
        expect(stateUpdate).toHaveProperty('block_hash');
        expect(stateUpdate.block_hash).toBe(exampleBlockHash);
        expect(stateUpdate).toHaveProperty('new_root');
        expect(stateUpdate).toHaveProperty('old_root');
        expect(stateUpdate).toHaveProperty('state_diff');
      });
    });

    test('getNonceForAddress()', async () => {
      const nonce = await testProvider.getNonceForAddress(erc20ContractAddress);
      return expect(toBN(nonce)).toEqual(toBN('0x0'));
    });

    test('getClassAt(contractAddress, blockNumber="latest")', async () => {
      const classResponse = await testProvider.getClassAt(erc20ContractAddress);

      expect(classResponse).toHaveProperty('program');
      expect(classResponse).toHaveProperty('entry_points_by_type');
    });

    // TODO see if feasible to split
    describe('GetClassByHash', () => {
      test('responses', async () => {
        const classResponse = await testProvider.getClassByHash(erc20ClassHash);
        expect(classResponse).toHaveProperty('program');
        expect(classResponse).toHaveProperty('entry_points_by_type');
        expect(classResponse).toHaveProperty('abi');
      });
    });

    describe('getStorageAt', () => {
      test('with "key" type of number', () => {
        return expect(testProvider.getStorageAt(erc20ContractAddress, 0)).resolves.not.toThrow();
      });

      test('"key" type of string', () => {
        return expect(
          testProvider.getStorageAt(erc20ContractAddress, '0x0')
        ).resolves.not.toThrow();
      });

      test('with "key" type of BN', () => {
        return expect(
          testProvider.getStorageAt(erc20ContractAddress, toBN('0x0'))
        ).resolves.not.toThrow();
      });
    });

    test('getTransaction() - failed retrieval', () => {
      return expect(testProvider.getTransaction(wrongClassHash)).rejects.toThrow(LibraryError);
    });

    test('getTransaction() - successful deploy transaction', async () => {
      const transaction = await testProvider.getTransaction(exampleTransactionHash);

      expect(transaction).toHaveProperty('transaction_hash');
    });

    test('getTransactionReceipt() - successful transaction', async () => {
      const transactionReceipt = await testProvider.getTransactionReceipt(exampleTransactionHash);

      expect(transactionReceipt).toHaveProperty('actual_fee');
      expect(transactionReceipt).toHaveProperty('transaction_hash');
      expect(transactionReceipt).toHaveProperty('status');
      expect(transactionReceipt).toHaveProperty('actual_fee');
    });

    describe('callContract()', () => {
      test('callContract()', () => {
        return expect(
          testProvider.callContract({
            contractAddress: erc20ContractAddress,
            entrypoint: 'balanceOf',
            calldata: compileCalldata({
              user: '0x9ff64f4ab0e1fe88df4465ade98d1ea99d5732761c39279b8e1374fa943e9b',
            }),
          })
        ).resolves.not.toThrow();
      });

      test('callContract() - user wallet', () => {
        return expect(
          testProvider
            .callContract({
              contractAddress: erc20ContractAddress,
              entrypoint: 'balanceOf',
              calldata: compileCalldata({
                user: wallet,
              }),
            })
            .then((res) => {
              expect(Array.isArray(res.result)).toBe(true);
            })
        ).resolves.not.toThrow();
      });

      test('callContract() - gateway error', async () => {
        return expect(
          testProvider.callContract({
            contractAddress: erc20ContractAddress,
            entrypoint: 'non_existent_entrypoint',
            calldata: compileCalldata({
              user: '0xdeadbeef',
            }),
          })
        ).rejects.toThrowError();
      });
    });
  });
});
