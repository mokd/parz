type ParzResult<O,P, TError> = ParseResult<O,P, TError> | ValidationResult<O,P, TError>
type ParseResult<O, P, TError> = ParseValid<O, P> | ParseInvalid<TError>
type ValidationResult<O,P, TError> = ValidationValid<O,P> | ValidationInvalid<O, P, TError>

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

type ParseInvalid<TError> = {
    errors : TError[],
    parseResultType : ResultType.PARSE_INVALID
}

type ValidationValid<O,P> = {
    original : O,
    target : P
    parseResultType : ResultType.VALIDATION_VALID
}

type ValidationInvalid<O,P, TError> = {
    original : O,
    target : P
    errors : TError[],
    parseResultType : ResultType.VALIDATION_INVALID
}

type ParseContinuable<O,P,TError> = ParseValid<O,P> | ValidationValid<O,P> | ValidationInvalid<O,P,TError> 

function isContinuable<O,P,TError>(value : ParzResult<O,P, TError>): value is ParseContinuable<O,P,TError> {
    return value.parseResultType !== ResultType.PARSE_INVALID
}

function isParseValid<O,P,TError>(value : ParzResult<O,P, TError>) : value is ParseValid<O,P> {
    return value.parseResultType === ResultType.PARSE_VALID
}

function isParseInvalid<O,P,TError>(value : ParzResult<O,P, TError>) : value is ParseInvalid<TError> {
    return value.parseResultType === ResultType.PARSE_INVALID
}

function isValidationValid<O,P, TError>(value : ParzResult<O,P, TError>) : value is ValidationValid<O,P> {
    return value.parseResultType === ResultType.VALIDATION_VALID
}

function isValidationInvalid<O,P, TError>(value : ParzResult<O,P, TError>) : value is ValidationInvalid<O,P,TError> {
    return value.parseResultType === ResultType.VALIDATION_INVALID
}


function validParse<O,P>(original : O, target : P) : ParseValid<O,P> {
    return {
        original : original,
        target : target,
        parseResultType: ResultType.PARSE_VALID
    }
}

function invalidParse<O,TError>(errors : TError[]) : ParseInvalid<TError> {
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

function invalidValdation<O,P, TError>(original : O, target : P, errors : TError[]) : ValidationInvalid<O,P, TError> {
    return {
        original : original,
        target : target,
        errors : errors,
        parseResultType: ResultType.VALIDATION_INVALID
    }
}

class Parz<A, B, C, TError> {

    private constructor(private original : A, private output : ParzResult<B, C, TError>, private errors : TError[]) {}

    private static id = <T>(t : T) => validValdation(t, t)

    static init<A, TError>(val : A) {
        return new Parz<A, A, A, TError>(val, this.id(val), [])
    }

    then<T1>(fn : ((val : C) => ParzResult<C, T1, TError>)) : Parz<A, C, T1, TError> {

        if (isContinuable(this.output)) {

            const result = fn(this.output.target)

            if (isParseValid(result) || isValidationValid(result)) {
                return new Parz<A, C, T1, TError>(this.original, result, this.errors)
            }
    
            if (isValidationInvalid(result)) {
                return new Parz<A, C, T1, TError>(this.original, result, this.errors.concat(result.errors))
            }

            if (isParseInvalid(result)) {
                return new Parz<A, C, T1, TError>(this.original, invalidParse(this.errors.concat(result.errors)), this.errors.concat(result.errors))
            }

        } else {
            return new Parz<A, C, T1, TError>(this.original, invalidParse(this.errors.concat(this.output.errors)), this.errors)
        }

        return new Parz<A, C, T1, TError>(this.original, invalidParse([]), [])
    }

    value() : ResultOfValdiationOrParse<A, C, TError> {
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

export type ValidationOrParseFail<O, TError> = {
    original : O,
    errors : TError[]
    type: ResultOfValdiationOrParseType.FAIL
}
export type ValidationOrParseSuccess<O, P> = {
    original: O,
    target: P,
    type: ResultOfValdiationOrParseType.SUCCESS
}

type ResultOfValdiationOrParse<O,P, TError> = ValidationOrParseFail<O, TError> | ValidationOrParseSuccess<O,P>

export const isSuccess = <O,P,TError>(res : ResultOfValdiationOrParse<O,P,TError>): res is ValidationOrParseSuccess<O,P> => {
    return res.type === ResultOfValdiationOrParseType.SUCCESS
}

export const isFail = <O,P,TError>(res : ResultOfValdiationOrParse<O,P, TError>): res is ValidationOrParseFail<O, TError> => {
    return res.type === ResultOfValdiationOrParseType.FAIL
}

export const startWith = <O, TError>(val : O) => {
    return Parz.init<O, TError>(val);
}

export const createValidator = <TError, O>(fn : ((val: O) => boolean), errorFn: (val : O) => NonEmptyArray<TError>) => (val : O) => {
    if (fn(val)) {
        return validValdation(val, val)
    } else {
        return invalidValdation(val, val, errorFn(val))
    }
}

export const createParser = <O,T,TError>(fn : ((val : O) => T | null), errorFn: (val : O) => NonEmptyArray<TError>) => (val : O) => {
    const result = fn(val)
    if (result !== null) {
        return validParse(val, result)
    } else {
        return invalidParse<O,TError>(errorFn(val))
    }
}