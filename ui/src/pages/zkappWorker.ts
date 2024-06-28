import { Field, Mina, PublicKey, fetchAccount } from 'o1js';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { IsNumberEven } from '../../../contracts/src/IsNumberEven';

const state = {
  IsNumberEven: null as null | typeof IsNumberEven,
  zkapp: null as null | IsNumberEven,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Network = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
      // 'http://127.0.0.1:8080/graphql'
    );
    console.log('Devnet network instance configured.');
    Mina.setActiveInstance(Network);
  },
  loadContract: async (args: {}) => {
    const { IsNumberEven } = await import('../../../contracts/build/src/IsNumberEven.js');
    state.IsNumberEven = IsNumberEven;
  },
  compileContract: async (args: {}) => {
    await state.IsNumberEven!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.IsNumberEven!(publicKey);
  },
  createUpdateTransaction: async (args: {}) => {
    const transaction = await Mina.transaction(async () => {
      await state.zkapp!.determineRandomNumberEvenness();
    });
    state.transaction = transaction;
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
  updateRandomNumber: async (args: {randomNumber: number}) => {
    await state.zkapp!.updateRandomNumber(Field(args.randomNumber));
  },
  determineRandomNumberEvenness: async (args: {}) => {
    return await state.zkapp!.determineRandomNumberEvenness();
  },
  fetchEvenness: async (args: {}) => {
    return await state.zkapp!.isRandomNumberEven.getAndRequireEquals().toBigInt();
  }
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== 'undefined') {
  addEventListener(
    'message',
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      console.log('🚀 ~ event:', event.data);
      const returnData = await functions[event.data.fn](event.data.args);
      

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log('Web Worker Successfully Initialized.');