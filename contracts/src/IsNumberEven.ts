import { Field, SmartContract, state, State, method, Provable } from 'o1js';

export class IsNumberEven extends SmartContract {
  @state(Field) isRandomNumberEven = State<Field>();
  @state(Field) randomNumber = State<Field>();

  @method async updateRandomNumber(number: Field) {
    this.randomNumber.set(number);
  }

  // Method to determine the evenness of the number
  @method async determineRandomNumberEvenness() {
    const currentRandomNumberState = this.randomNumber.getAndRequireEquals();

    const isEven = Provable.if(
      currentRandomNumberState.isEven(),
      Field(1), // Return Field(1) for true (even)
      Field(0) // Return Field(0) for false (odd)
    );

    this.isRandomNumberEven.set(isEven);
  }
}
