const { I, Error } = require("@reified/intrinsics");
const { ErrorFactory } = require("@reified/foundation/factory");


module.exports = ErrorFactory `ExitCodeError` (class extends Error
{
    constructor(options)
    {
        super(`Process exited with status: ${options.exitCode}`, options);

        return I `Object.assign` (this, options);
    }
});
