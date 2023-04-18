const given = f => f();

const { spawn: spawn_native } = require("child_process");
const { Readable, Stream } = require("stream");

const fail = require("@reified/fail");
const { I, Call } = require("@reified/intrinsics");
const { α, ø, o } = require("@reified/object");
const ƒ = require("@reified/function");
const Δ = require("@reified/delta");
const { IsArray, IsString, IsObject, IsFunctionObject } = require("@reified/foundation/types-and-values");
// FIXME: Use a better copy system...
const ArrayCopy = array => [...array];

const ExitCodeError = require("./exit-code-error");

const toNormalizedArguments = original => given((
    flattened = Call(I.Array.prototype.flat, original),
    options = ø(...Δ.filter(IsObject)(flattened)),
    args = Δ.filter(IsString)(flattened)) =>
    ({ args, options }));

const toNormalizedStdio = stdio =>
    IsString(stdio) ? [stdio, stdio, stdio] :
    IsArray(stdio) ? ArrayCopy(stdio) :
    ["pipe", "pipe", "pipe"];


module.exports = ƒ `spawn`
({
    [ƒ.apply]: (spawn, _, args) =>
        implementation(spawn, ...args),

    for: ƒ `spawn.for`
    ({
        [ƒ.apply]: (_, spawn, prefixes) => Δ(spawn,
            Δ.update("prefix", prefix =>
                prefix ? [...prefix, ...prefixes] : ArrayCopy(prefixes))),

        [ƒ.tag]: (_, spawn, tag) => Δ(spawn,
            Δ.update("prefix", prefix => prefix ? [...prefix, tag] : [tag]))
    }),

    parsed: ƒ.method `spawn.parsed` ((_, spawn, [options]) =>
        IsFunctionObject(options)?
            Δ(spawn, Δ.set("parse", options)) :
        IsObject(options) &&
        I `Object.hasOwn` (options, "split") ?
            given(({ split } = options) =>
                Δ(spawn, Δ.set("parse",
                    ({ stdout }) => stdout.trim().split(split)))) :
        IsObject(options) &&
        I `Object.hasOwn` (options, "trim") ?
            options.trim ?
                Δ(spawn, Δ.set("parse",
                    ({ stdout }) => stdout.trim())) :
                Δ(spawn, Δ.set("parse", ({ stdout }) => stdout)) :
            fail.type (
                `spawn.parsed takes either a function or an ` +
                `object with a split or trim key`)),

    get spawn()
    {
        return this;
    },

    get verbose()
    {
        return Δ(this, Δ.set("stdio", ["ignore", "inherit", "inherit"]));
    },

    get silent()
    {
        return Δ(this, Δ.set("stdio", "ignore"));
    },

    get stderr()
    {
        return Δ(this, Δ.set("stdio", [[0, process.stderr, process.stderr]]));
    }
});

function implementation (...unpartitioned)
{
    const { args: unprefixed, options } = toNormalizedArguments(unpartitioned);
    const { prefix = [], parse = x => x } = options;
    const [command, ...args] = [...prefix, ...unprefixed];

    let child = null;
    return Object.assign(new Promise(function (resolve, reject)
    {
        const { captureStdio = true, rejectOnExitCode = true, stdio } = options;
        const captured = { stdout: "", stderr: "" };
        const input =
            IsString(options.input) &&
            Readable.from([options.input], { objectMode: false });

        const normalizedStdio = toNormalizedStdio(stdio);
        const alteredStdio = Object.assign(
            [],
            normalizedStdio,
            captureStdio && { 1: "pipe", 2: "pipe" },
            input && { 0: "pipe" });
        const optionsWithAlteredStdio = Object.assign({ }, options, { stdio: alteredStdio });

        const start = new Date();

        child = spawn_native(command, args, optionsWithAlteredStdio);

        if (captureStdio)
        {
            child.stdout.on("data", aString => captured.stdout += aString + "");
            child.stderr.on("data", aString => captured.stderr += aString + "");

            if (normalizedStdio[1] === "inherit")
                child.stdout.pipe(process.stdout);

            else if (normalizedStdio[1] instanceof Stream)
                child.stdout.pipe(normalizedStdio[1]);

            if (normalizedStdio[2] === "inherit")
                child.stderr.pipe(process.stderr);

            else if (normalizedStdio[2] instanceof Stream)
                child.stderr.pipe(normalizedStdio[2]);
        }

        if (input)
            input.pipe(child.stdin);

        child.on("close", function (exitCode)
        {
            const duration = new Date() - start;
            const result = Object.assign(
                { exitCode, duration },
                captureStdio && captured);

            if (exitCode !== 0 && rejectOnExitCode)
                return reject(ExitCodeError({ exitCode, ...result }));

            resolve(parse(result));
        });
    }), { process: child });
}
