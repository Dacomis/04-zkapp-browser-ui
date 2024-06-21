import { Field, SmartContract, state, State, method } from 'o1js';

export class RandomNumberGenerator extends SmartContract {
  @state(Field) randomNumber = State<Field>();

  @method async generateNumber(randomValue: Field) {
    this.randomNumber.set(randomValue);
  }
}
