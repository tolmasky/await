const given = f => f();

const fail = require("@reified/fail");
const TimeoutError = require("@await/timeout-error");

const _AbortController = AbortController;
const _cancelTimeout = cancelTimeout;
const _DOMException = DOMException;
const _fetch = fetch;
const _setTimeout = setTimeout;

const { ABORT_ERR } = _DOMException;

const toTimeoutSignal = timeout =>
    timeout >= 0 &&
    timeout < Infinity && given((
        controller = new _AbortController(),
        timeoutID = _setTimeout(() => controller.abort(), timeout)) =>
        Object.assign(controller.signal,
        {
            cancel: () => _cancelTimeout(timeoutID),
        }));

module.exports = async function fetch(resource, { timeout, ...rest })
{
    const signal = toTimeoutSignal(timeout);

    try
    {
        return await _fetch(resource, { ...rest, ...signal && { signal } })
            .catch(error =>
                error instanceof _DOMException &&
                error.code === ABORT_ERR &&
                signal.aborted ?
                    fail(new TimeoutError(`Fetching ${resource} timed out.`)) :
                    fail(error));
    }
    finally
    {
        signal && signal.cancel();
    }
}
