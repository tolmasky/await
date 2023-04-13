const I = require("@reified/intrinsics");
const { α } = require("@reified/object");
const { Error } = I;


function ExitCodeError (exitCode, properties)
{
    const error = α(
        Error(`Process exited with status: ${exitCode}`),
        { exitCode },
        properties);

    I `Object.defineProperty` (error, "name",
    {
        value: "ExitCodeError",
        writable: true,
        enumerable: false,
        configurable: true
    });

    return I `Object.setPrototypeOf` (error, ExitCodeError.prototype);
}

module.exports = ExitCodeError;

I `Object.setPrototypeOf` (ExitCodeError.prototype, Error.prototype);
