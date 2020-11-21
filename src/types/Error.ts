export class ErrorTemplate extends Error {
    constructor(e?: string) {
        super(e);
        this.name = new.target.name;
    }

    toString(): string {
        return this.message ? `${this.name}: ${this.message}` : `${this.name}`;
    }
}

export class DownloadTimeOutError extends ErrorTemplate { }
export class UserCancelledError extends ErrorTemplate { }
export class CalculateUnfinishedError extends ErrorTemplate { }
export class ExpectedTokenError extends ErrorTemplate { }
export class GenerateError extends ErrorTemplate { }