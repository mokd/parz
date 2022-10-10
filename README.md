# Parz

A simple utility for parsing and validating values. The motivation behind is stateless validaton of html input fields.

You can chain multiple validators and parsers with `then`. If a validator fails, it will keep on validating and return the results for all validators. If a parser fails, it will stop and return all the errors up to that point.

## Usage

Start by creating a validator. `createValidator` expects two functions, one for validation `T -> boolean`, and one for error handling `T -> NonEmptyArray<E>`.  

```ts
import { createValidator } from '@mokd/parz'

const stringOfLength5 = createValidator(
    (str : string) => str.length === 5,
    (str) => [`String is not length 5, it is actually of length ${str.length}`]
)
```

Once you have a validator, you can do this:

```ts
import { startWith, isFail, isSuccess } from '@mokd/parz'

const validationResult = startWith<string, string>("Hello")
    .then(stringOfLength5)
    .value()

if (isSuccess(validationResult)) {
    console.log(validationResult.target) // target is string
}
```

Sometimes, we also want to parse/transform. `createParser` takes two functions, one `TOriginal -> TParsed`, and one `TOriginal -> NonEmptyArray<TError>`. To indicate parsing failure, you **must** return `null` on failure. If not, you'll have undefined behaviour.

```ts
import { createParser } from '@mokd/parz'

const stringToInteger = createParser(
    (str : string) => {
        const res = parseInt(str)
        if (isNaN(res)) return null;
        return res;
    }, 
    (str) => [`${str} cannot be parsed to an integer`]
)
```

Parsers and validators can be composed:

```ts
const onesAndThenZeros = createValidator(
    (str : string) => RegExp(/^10+$/).test(str), 
    (str) => [`${str} must start with a one and end with one or more zeroes`]
)

const stringToInteger = createParser(
    (str : string) => {
        const res = parseInt(str)
        if (isNaN(res)) return null;
        return res;
    }, 
    (str) => [`${str} cannot be parsed to an integer`]
)

const atLeastOneThousand = createValidator(
    (n : number) => n > 1000, 
    (n) => [`${n} must be at least 1000`]
)

const fn = (oneAndZeroes : string) => startWith<string, string>(oneAndZeroes)
        .then(onesAndThenZeros)
        .then(stringToInteger)
        .then(atLeastOneThousand)
        .value() 
        
const successResult = fn("10000") 

if (isSuccess(successResult)) {
    console.log(successResult.target) // target is number
    console.log(successResult.original) // original is string
}

const failResult = fn("100")

if (isSuccess(failResult)) {
    console.log(failResult.errors) // errors is string[], as specified in the second type parameter of startWith
    console.log(failResult.original) // original is string
}
```

Example for composite values:

```ts
const composite = {
    length : startWith("10").then(stringToInteger).value(),
    width : startWith("10").then(stringToInteger).value(),
    heigth : startWith("10").then(stringToInteger).value()
}

const computeVolume = createParser(
    (num : typeof composite) => {
        if (isSuccess(num.length) && isSuccess(num.width) && isSuccess(num.heigth)) {
            return num.length.target * num.width.target * num.heigth.target;
        }
        return null;
    },
    (num) => ["Unable to compute volume"]
)

const maybeVolume = startWith(composite)
    .then(computeVolume)
    .value()
```

