type ParzResult<O,P> = ParseResult<O,P> | ValidationResult<O,P>
type ParseResult<O, P> = ParseValid<O, P> | ParseInvalid
type ValidationResult<O,P> = ValidationValid<O,P> | ValidationInvalid<O, P>

type NonEmptyArray<T> = [T, ...T[]]

enum ResultType {
    PARSE_VALID = "PARSE_VALID",
    PARSE_INVALID = "PARSE_INVALID",
    VALIDATION_VALID = "VALIDATION_VALID",
    VALIDATION_INVALID = "VALIDATION_INVALID"
}

type ParseValid<O,P> = {
    original : O,
    target : P
    parseResultType : ResultType.PARSE_VALID
}

type ParseInvalid = {
    errors : string[],
    parseResultType : ResultType.PARSE_INVALID
}

type ValidationValid<O,P> = {
    original : O,
    target : P
    parseResultType : ResultType.VALIDATION_VALID
}

type ValidationInvalid<O,P> = {
    original : O,
    target : P
    errors : string[],
    parseResultType : ResultType.VALIDATION_INVALID
}

type ParseContinuable<O,P> = ParseValid<O,P> | ValidationValid<O,P> | ValidationInvalid<O,P> 

function isContinuable<O,P>(value : ParzResult<O,P>): value is ParseContinuable<O,P> {
    return value.parseResultType !== ResultType.PARSE_INVALID
}

function isParseValid<O,P>(value : ParzResult<O,P>) : value is ParseValid<O,P> {
    return value.parseResultType === ResultType.PARSE_VALID
}

function isParseInvalid<O,P>(value : ParzResult<O,P>) : value is ParseInvalid {
    return value.parseResultType === ResultType.PARSE_INVALID
}

function isValidationValid<O,P>(value : ParzResult<O,P>) : value is ValidationValid<O,P> {
    return value.parseResultType === ResultType.VALIDATION_VALID
}

function isValidationInvalid<O,P>(value : ParzResult<O,P>) : value is ValidationInvalid<O,P> {
    return value.parseResultType === ResultType.VALIDATION_INVALID
}


function validParse<O,P>(original : O, target : P) : ParseValid<O,P> {
    return {
        original : original,
        target : target,
        parseResultType: ResultType.PARSE_VALID
    }
}

function invalidParse<O>(errors : string[]) : ParseInvalid {
    return {
        errors : errors,
        parseResultType: ResultType.PARSE_INVALID
    }
}

function validValdation<O,P>(original : O, target : P) : ValidationValid<O,P> {
    return {
        original : original ,
        target : target,
        parseResultType: ResultType.VALIDATION_VALID
    }
}

function invalidValdation<O,P>(original : O, target : P, errors : string[]) : ValidationInvalid<O,P> {
    return {
        original : original,
        target : target,
        errors : errors,
        parseResultType: ResultType.VALIDATION_INVALID
    }
}

class Parz<A, B, C> {

    private constructor(private original : A, private output : ParzResult<B, C>, private errors : string[]) {}

    private static id = <T>(t : T) => validValdation(t, t)

    static init<A>(val : A) {
        return new Parz<A, A, A>(val, this.id(val), [])
    }

    then<T1>(fn : ((val : C) => ParzResult<C, T1>)) : Parz<A, C, T1> {

        if (isContinuable(this.output)) {

            const result = fn(this.output.target)

            if (isParseValid(result) || isValidationValid(result)) {
                return new Parz<A, C, T1>(this.original, result, this.errors)
            }
    
            if (isValidationInvalid(result)) {
                return new Parz<A, C, T1>(this.original, result, this.errors.concat(result.errors))
            }

            if (isParseInvalid(result)) {
                return new Parz<A, C, T1>(this.original, invalidParse(this.errors.concat(result.errors)), this.errors.concat(result.errors))
            }

        } else {
            return new Parz<A, C, T1>(this.original, invalidParse(this.errors.concat(this.output.errors)), this.errors)
        }

        return new Parz<A, C, T1>(this.original, invalidParse([]), [])
    }

    value() : ResultOfValdiationOrParse<A, C> {
        if ((isParseValid(this.output) || isValidationValid(this.output)) && this.errors.length === 0) {
            return {
                original : this.original,
                target : this.output.target,
                type : ResultOfValdiationOrParseType.SUCCESS
            }
        } else {
            return {
                original : this.original,
                errors : this.errors,
                type : ResultOfValdiationOrParseType.FAIL
            }
        }
    }
}

enum ResultOfValdiationOrParseType {
    SUCCESS = "SUCCESS",
    FAIL = "FAIL",
}

export type ValidationOrParseFail<O> = {
    original : O,
    errors : string[]
    type: ResultOfValdiationOrParseType.FAIL
}
export type ValidationOrParseSuccess<O, P> = {
    original: O,
    target: P,
    type: ResultOfValdiationOrParseType.SUCCESS
}

type ResultOfValdiationOrParse<O,P> = ValidationOrParseFail<O> | ValidationOrParseSuccess<O,P>

export const isSuccess = <O,P>(res : ResultOfValdiationOrParse<O,P>): res is ValidationOrParseSuccess<O,P> => {
    return res.type === ResultOfValdiationOrParseType.SUCCESS
}

export const isFail = <O,P>(res : ResultOfValdiationOrParse<O,P>): res is ValidationOrParseFail<O> => {
    return res.type === ResultOfValdiationOrParseType.FAIL
}

export const startWith = <O>(val : O) => {
    return Parz.init<O>(val);
}

export const createValidator = <O>(fn : ((val: O) => boolean), errorFn: (val : O) => NonEmptyArray<string>) => (val : O) => {
    if (fn(val)) {
        return validValdation(val, val)
    } else {
        return invalidValdation(val, val, errorFn(val))
    }
}

export const createParser = <O,T>(fn : ((val : O) => T | null), errorFn: (val : O) => NonEmptyArray<string>) => (val : O) => {
    const result = fn(val)
    if (result !== null) {
        return validParse(val, result)
    } else {
        return invalidParse<O>(errorFn(val))
    }
}