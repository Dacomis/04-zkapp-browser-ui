import { Bool, Field, Mina, PublicKey, fetchAccount } from 'o1js';

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { GuessGame } from '../../../contracts/src/GuessGame';

const state = {
  GuessGame: null as null | typeof GuessGame,
  zkapp: null as null | GuessGame,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  setActiveInstanceToDevnet: async (args: {}) => {
    const Network = Mina.Network(
      'https://api.minascan.io/node/devnet/v1/graphql'
    );
    console.log('Devnet network instance configured.');
    Mina.setActiveInstance(Network);
  },
  loadContract: async (args: {}) => {
    const { GuessGame } = await import('../../../contracts/build/src/GuessGame.js');
    state.GuessGame = GuessGame;
  },
  compileContract: async (args: {}) => {
    await state.GuessGame!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    state.zkapp = new state.GuessGame!(publicKey);
  },
  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
  generateNumber: async (args: { randomNumber: number }) => {
    await Mina.transaction(async () => {
        const fieldNumber = Field(args.randomNumber);  // Convert number to Field here
        await state.zkapp!.generateNumber(fieldNumber);
    });
  },
  fetchNumber: async (args: {}) => {
    return await state.zkapp!.randomNumber.get();
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