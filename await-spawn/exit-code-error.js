const { I: { I, Error } } = require("@reified/ecma-262");
const { ErrorFactory } = require("@reified/core/factory");


module.exports = ErrorFactory `ExitCodeError` (class extends Error
{
    constructor(options)
    {
        super(`Process exited with status: ${options.exitCode}`, options);

        return I `Object.assign` (this, options);
    }
});
