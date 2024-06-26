import { Field, PublicKey } from 'o1js';
import { useEffect, useState } from 'react';
import GradientBG from '../components/GradientBG.js';
import styles from '../styles/Home.module.css';
import './reactCOIServiceWorker';
import ZkappWorkerClient from './zkappWorkerClient';

let transactionFee = 0.1;
// on remote node
const ZKAPP_ADDRESS = 'B62qp9fnHEUwfreFpKCWhTREBdyvkeP15f3hsioQKHpC1SWd222yYaR'; 

// on lightnet
// const ZKAPP_ADDRESS = 'B62qptxxnPmYMQsen8XeT41gy8aEcVZkMHXwFZQqmhrjarjBpE4DUvM'; 

export default function Home() {
  const [state, setState] = useState({
    zkappWorkerClient: null as null | ZkappWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
    randomNumber: null as null | Field
  });

  const [displayText, setDisplayText] = useState('');
  const [transactionLink, setTransactionLink] = useState('');
  const [displayRandomNumber, setDisplayRandomNumber] = useState(false);


  // -------------------------------------------------------
  // Do Setup

  useEffect(() => {
    async function timeout(seconds: number): Promise<void> {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, seconds * 1000);
      });
    }

    (async () => {
      if (!state.hasBeenSetup) {
        setDisplayText('Loading web worker...');
        console.log('Loading web worker...');
        const zkappWorkerClient = new ZkappWorkerClient();
        await timeout(5);

        setDisplayText('Done loading web worker');
        console.log('Done loading web worker');

        await zkappWorkerClient.setActiveInstanceToDevnet();

        const mina = (window as any).mina;

        if (mina == null) {
          setState({ ...state, hasWallet: false });
          return;
        }

        const publicKeyBase58: string = (await mina.requestAccounts())[0];
        const publicKey = PublicKey.fromBase58(publicKeyBase58);

        console.log(`Using key:${publicKey.toBase58()}`);
        setDisplayText(`Using key:${publicKey.toBase58()}`);

        setDisplayText('Checking if fee payer account exists...');
        console.log('Checking if fee payer account exists...');

        const res = await zkappWorkerClient.fetchAccount({
          publicKey: publicKey!,
        });
        const accountExists = res.error == null;

        await zkappWorkerClient.loadContract();


        console.log('Compiling zkApp...');
        setDisplayText('Compiling zkApp...');
        await zkappWorkerClient.compileContract();
        console.log('zkApp compiled');
        setDisplayText('zkApp compiled...');

        const zkappPublicKey = PublicKey.fromBase58(ZKAPP_ADDRESS);

        await zkappWorkerClient.initZkappInstance(zkappPublicKey);

        console.log('Getting zkApp state...');
        setDisplayText('Getting zkApp state...');
        await zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });
        console.log('🚀 ~ zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey });:', zkappWorkerClient.fetchAccount({ publicKey: zkappPublicKey }).then(result => result));
        console.log('🚀 ~ zkappPublicKey:', zkappPublicKey);
        setDisplayText('');

        setState({
          ...state,
          zkappWorkerClient,
          hasWallet: true,
          hasBeenSetup: true,
          publicKey,
          zkappPublicKey,
          accountExists,
        });
      }
    })();
  }, []);

  // -------------------------------------------------------
  // Wait for account to exist, if it didn't

  useEffect(() => {
    (async () => {
      if (state.hasBeenSetup && !state.accountExists) {
        for (;;) {
          setDisplayText('Checking if fee payer account exists...');
          console.log('Checking if fee payer account exists...');
          const res = await state.zkappWorkerClient!.fetchAccount({
            publicKey: state.publicKey!,
          });
          const accountExists = res.error == null;
          if (accountExists) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        setState({ ...state, accountExists: true });
      }
    })();
  }, [state.hasBeenSetup]);

  // -------------------------------------------------------
  // Send a transaction

  const onSendTransaction = async () => {
    setState({ ...state, creatingTransaction: true });

    setDisplayText('Creating a transaction...');
    console.log('Creating a transaction...');

    await state.zkappWorkerClient!.fetchAccount({
      publicKey: state.publicKey!,
    });

    await state.zkappWorkerClient!.compileContract(); // new line added to compile the contract
    await state.zkappWorkerClient!.createUpdateTransaction();

    setDisplayText('Creating proof...');
    console.log('Creating proof...');
    await state.zkappWorkerClient!.proveUpdateTransaction();

    console.log('Requesting send transaction...');
    setDisplayText('Requesting send transaction...');
    const transactionJSON = await state.zkappWorkerClient!.getTransactionJSON();
    console.log('🚀 ~ onSendTransaction ~ transactionJSON:', transactionJSON);

    setDisplayText('Getting transaction JSON...');
    console.log('Getting transaction JSON...');
    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: transactionFee,
        memo: '',
      },
    });

    const transactionLink = `https://minascan.io/devnet/tx/${hash}`;
    console.log(`View transaction at ${transactionLink}`);

    setTransactionLink(transactionLink);
    setDisplayText(transactionLink);

    setState({ ...state, creatingTransaction: false });
  };

  // -------------------------------------------------------
  // Refresh the current state

  const handleGuess = async (guessIsEven: boolean) => {
    if (!state.zkappWorkerClient) return;

    const randomNumber = Math.floor(Math.random() * 100) + 1;
    console.log('🚀 ~ handleGuess ~ randomNumber:', randomNumber);

    try {
      const generatedRandomNumber = await state.zkappWorkerClient.updateRandomNumber(randomNumber);
      console.log('🚀 ~ handleGuess ~ generatedRandomNumber:', generatedRandomNumber);

      const evennessResult = await state.zkappWorkerClient.determineRandomNumberEvenness();
      console.log('🚀 ~ handleGuess ~ evennessResult:', evennessResult);

      const fetchEvenness =
        await state.zkappWorkerClient.fetchEvenness();
      console.log('🚀 ~ fetchAndDisplayNumber ~ fetchEvenness:',
        fetchEvenness);

      // const isEven = JSON.parse(evennessResult as string);
      // console.log('🚀 ~ Number Evenness:', isEven);

      // Logic to update the state based on the evenness result
      setState({ ...state, randomNumber: generatedRandomNumber as Field });
      // const result = guessIsEven === isEven ? 'Correct!' : 'Wrong!';
      // setDisplayText(`The number was ${randomNumber}. You are ${result}`);

    } catch (error) {
      console.error("Error during transaction:", error);
      setDisplayText('Error processing your guess.');
    }
  };


  // -------------------------------------------------------
  // Create UI elements

  let hasWallet;
  if (state.hasWallet != null && !state.hasWallet) {
    const auroLink = 'https://www.aurowallet.com/';
    const auroLinkElem = (
      <a href={auroLink} target="_blank" rel="noreferrer">
        Install Auro wallet here
      </a>
    );
    hasWallet = <div>Could not find a wallet. {auroLinkElem}</div>;
  }

  const stepDisplay = transactionLink ? (
    <a
      href={transactionLink}
      target="_blank"
      rel="noreferrer"
      style={{ textDecoration: 'underline' }}
    >
      View transaction
    </a>
  ) : (
    displayText
  );

  let setup = (
    <div
      className={styles.start}
      style={{ fontWeight: 'bold', fontSize: '1.5rem', paddingBottom: '5rem' }}
    >
      {hasWallet}
    </div>
  );

  let accountDoesNotExist;
  if (state.hasBeenSetup && !state.accountExists) {
    const faucetLink =
      'https://faucet.minaprotocol.com/?address=' + state.publicKey!.toBase58();
    accountDoesNotExist = (
      <div>
        <span style={{ paddingRight: '1rem' }}>Account does not exist.</span>
        <a href={faucetLink} target="_blank" rel="noreferrer">
          Visit the faucet to fund this fee payer account
        </a>
      </div>
    );
  }

  let mainContent;
  if (state.hasBeenSetup && state.accountExists) {
    mainContent = (
      <div style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className={styles.start} style={{ fontWeight: 'bold', fontSize: '1.5rem', paddingBottom: '5rem' }}>
          Is the number Even or Uneven?
        </div>
        <div className={styles.card}>
          {displayRandomNumber && state.randomNumber?.toString()}
        </div>
        <button
          className={styles.card}
          onClick={() => onSendTransaction()}
        >
          Even
        </button>
        <button
          className={styles.card}
          onClick={() => onSendTransaction()}
        >
          Uneven
        </button>

        <button
          className={styles.card}
          onClick={() => handleGuess(true)}
          disabled={!!state.randomNumber}
        >
          Did I won?
        </button>

        {/* {state.lastGuessCorrect !== null
          ? (state.lastGuessCorrect
            ? <div className={styles.card}>You have won</div>
            : <div className={styles.card}>You have lost</div>)
          : ""
        } */}
      </div>
    );
  }

  return (
    <GradientBG>
      <div className={styles.main} style={{ padding: 0 }}>
        <div className={styles.center} style={{ padding: 0 }}>
          {setup}
          {accountDoesNotExist}
          {mainContent}
        </div>
      </div>
    </GradientBG>
  );
}