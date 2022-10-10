import {describe, expect, test} from '@jest/globals';
import { createParser, createValidator, isFail, isSuccess, startWith, ValidationOrParseFail, ValidationOrParseSuccess } from './parz';

describe('Test validation', () => {

    const stringOfLength5 = createValidator(
        (str : string) => str.length === 5,
        (str) => [`String is not length 5, it is actually of length ${str.length}`]
    )

    test("Simple validation success", () => {
        const res = startWith<string, string>("12345")
            .then(stringOfLength5)
            .value()

        const validationResult = isFail(res)
        expect(validationResult).toBe(false)
    })

    test("Simple validation fail", () => {
        const res = startWith<string, string>("1")
            .then(stringOfLength5)
            .value()

        const checked = isFail(res)
        expect(checked).toBe(true)

        const value = res as unknown as ValidationOrParseFail<string, string>

        expect(value.errors).toStrictEqual([`String is not length 5, it is actually of length 1`])
    })
})

describe("Test multiple failed validations", () => {

    const stringOfLength5 = createValidator(
        (str : string) => str.length === 5,
        (str) => [`String is not length 5, it is actually of length ${str.length}`]
    )

    const stringOfLength1 = createValidator(
        (str : string) => str.length === 1,
        (str) => [`String is not length 5, it is actually of length ${str.length}`]
    )

    const lessThanTen = createValidator(
        (number : number) => number < 10,
        (number : number) => [`Expected a number less than 10, but was actually ${number}`]
    )

    const stringToInteger = createParser(
        (str : string) => {
            const res = parseInt(str)
            if (isNaN(res)) return null;
            return res;
        }, 
        (str) => [`${str} cannot be parsed to an integer`]
        )

    test("Two failed validations should result in two errors", () => {
        const res = startWith<string, string>("1")
        .then(stringOfLength5)
        .then(stringOfLength5)
        .value() as unknown as ValidationOrParseFail<string, string>

        expect(res.errors.length).toBe(2)
        expect(res.errors).toStrictEqual([`String is not length 5, it is actually of length 1`, `String is not length 5, it is actually of length 1`])
    })

    test("Two failed validations followed by a successful one should result in two errors", () => {
        const res = startWith<string, string>("1")
        .then(stringOfLength5)
        .then(stringOfLength5)
        .then(stringOfLength1)
        .value() as unknown as ValidationOrParseFail<string, string>

        expect(res.errors.length).toBe(2)
        expect(res.errors).toStrictEqual([`String is not length 5, it is actually of length 1`, `String is not length 5, it is actually of length 1`])
    })

    test("Two failed validations followed by a failed parse should result in 3 errors", () => {
        const res = startWith<string, string>("a")
        .then(stringOfLength5)
        .then(stringOfLength5)
        .then(stringToInteger)
        .value() as unknown as ValidationOrParseFail<number, string>

        expect(res.errors.length).toBe(3)
    })

    test("A successful parse followed by two failed validations should return two errors", () => {
        const res = startWith("100")
            .then(stringToInteger)
            .then(lessThanTen)
            .then(lessThanTen)
            .value() as unknown as ValidationOrParseFail<number, string>

        expect(res.errors.length).toBe(2)
    })

    test("A failed validation, followed by a successful parse and then a failed validation should return two errors", () => {
        const res = startWith("100")
            .then(stringOfLength1)
            .then(stringToInteger)
            .then(lessThanTen)
            .value() as unknown as ValidationOrParseFail<number, string>

        expect(res.errors.length).toBe(2)
    })
})

describe("Test parsing", () => {

    const stringToInteger = createParser(
        (str : string) => {
            const res = parseInt(str)
            if (isNaN(res)) return null;
            return res;
        }, 
        (str) => [`${str} cannot be parsed to an integer`]
        )

    test("Simple transfrom from '1' to 1", () => {
        const res = startWith("1")
        .then(stringToInteger)
        .value() as ValidationOrParseSuccess<string, number>
        expect(res.target).toBe(1)
    })

})

describe("Composition", () => {

    const stringToInteger = createParser(
        (str : string) => {
            const res = parseInt(str)
            if (isNaN(res)) return null;
            return res;
        }, 
        (str) => [`${str} cannot be parsed to an integer`]
    )

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

    test("Check volume computation succeeds for valid input", () => {
        const res = startWith(composite)
        .then(computeVolume)
        .value() as unknown as ValidationOrParseSuccess<typeof composite,number>

        expect(res.target).toBe(1000)
    })

    const compositeJunk = {
        length : startWith("Hello!").then(stringToInteger).value(),
        width : startWith("yolo").then(stringToInteger).value(),
        heigth : startWith(":-)").then(stringToInteger).value()
    }

    test("Check volume computation fails for invalid input", () => {
        const res = startWith(compositeJunk)
            .then(computeVolume)
            .value() as unknown as ValidationOrParseFail<typeof compositeJunk, string>
    
        expect(res.errors).toStrictEqual(["Unable to compute volume"])
    })
})

describe("Custom error type", () => {

    const error = (num : number) => Object.assign({}, { mustBeValid : true, isValid: false, msg : `Number is ten or greater. Actual: ${num}`});

    const lessThanTen = createValidator(
        (number : number) => number < 10,
        (number) => [error(number)]
    )

    test("Returns custom type on failure", () => {
        const res = startWith<number, ReturnType<typeof error>>(11)
        .then(lessThanTen)
        .value()

        expect(isFail(res)).toBe(true)
        if (isFail(res)) {
            expect(res.errors).toStrictEqual([error(11)])
        }
    })
})