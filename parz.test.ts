import {describe, expect, test} from '@jest/globals';
import { createParser, createValidator, isJust, startWith, ParzJust, ParzError, ParzRes, deflate, isError } from './parz';

describe('Test validation', () => {

    const stringOfLength5 = createValidator(
        (str : string) => str.length === 5,
        (str) => [`String is not length 5, it is actually of length ${str.length}`]
    )

    test("Simple validation success", () => {
        const res = startWith("12345")
            .then(stringOfLength5)
            .value()

        expect(res.isJust()).toBe(true)
    })

    test("Simple validation fail", () => {
        const res = startWith("1")
            .then(stringOfLength5)
            .value()

        expect(res.isJust()).toBe(false)

        const value = res as unknown as ParzError<string>

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
        const res = startWith("1")
        .then(stringOfLength5)
        .then(stringOfLength5)
        .value() as unknown as ParzError<string>

        expect(res.errors.length).toBe(2)
        expect(res.errors).toStrictEqual([`String is not length 5, it is actually of length 1`, `String is not length 5, it is actually of length 1`])
    })

    test("Two failed validations followed by a successful one should result in two errors", () => {
        const res = startWith("1")
        .then(stringOfLength5)
        .then(stringOfLength5)
        .then(stringOfLength1)
        .value() as unknown as ParzError<string>

        expect(res.errors.length).toBe(2)
        expect(res.errors).toStrictEqual([`String is not length 5, it is actually of length 1`, `String is not length 5, it is actually of length 1`])
    })

    test("Two failed validations followed by a failed parse should result in 3 errors", () => {
        const res = startWith("a")
        .then(stringOfLength5)
        .then(stringOfLength5)
        .then(stringToInteger)
        .value() as unknown as ParzError<number>

        expect(res.errors.length).toBe(3)
    })

    test("A successful parse followed by two failed validations should return two errors", () => {
        const res = startWith("100")
            .then(stringToInteger)
            .then(lessThanTen)
            .then(lessThanTen)
            .value() as unknown as ParzError<number>

        expect(res.errors.length).toBe(2)
    })

    test("A failed validation, followed by a successful parse and then a failed validation should return two errors", () => {
        const res = startWith("100")
            .then(stringOfLength1)
            .then(stringToInteger)
            .then(lessThanTen)
            .value() as unknown as ParzError<number>

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
        .value() as ParzJust<string, number>
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

    const length = startWith("10").then(stringToInteger).value()
    const width = startWith("10").then(stringToInteger).value()
    const heigth = startWith("10").then(stringToInteger).value()

    test("Check volume computation succeeds for valid input", () => {

        const res = deflate({length, width, heigth}).mapDeflated(x => x.heigth*x.length*x.width).value()

        expect(res.isJust()).toBe(true)
        if (isJust(res)) {
            expect(res.target).toBe(1000)
        }
    })


    test("Check volume computation succeeds for invalid input", () => {

        const invalidLength = startWith("Hello :-)").then(stringToInteger).value()

        const res = deflate({invalidLength}).mapDeflated(x => x.invalidLength).value()

        expect(res.isError()).toBe(true)
        if (isError(res)) {
            expect(res.errors).toStrictEqual(["Hello :-) cannot be parsed to an integer"])
        }
    })
})