const given = f => f();

const { spawn: spawn_native } = require("child_process");
const { Readable, Stream } = require("stream");

const fail = require("@reified/fail");
const I = require("@reified/intrinsics");
const { α, ø, o } = require("@reified/object");
const ƒ = require("@reified/function");
const Δ = require("@reified/delta");

const ExitCodeError = require("./exit-code-error");

const toNormalizedArguments = original => given((
    flattened = I.Array.prototype.flat.call(original),
    options = ø(...flattened.filter(item => o.typeof(item) !== "string")),
    args = flattened.filter(item => o.typeof(item) === "string")) =>
    ({ args, options }));

//const 𝑝 = require("@reified/promise");

const cstdio = (name, stdio) => Δ => Δ.get (name, self => curry(this, Δ => Δ.fallback `options.stdio` (stdio)))


const spawn = ƒ `spawn`
({
    [ƒ.apply]: (spawn, _, args) =>
        implementation(...args, spawn),

    for: ƒ.tagged `spawn.for` ((_, spawn, tag) =>
        Δ(spawn, Δ.update("prefix", prefix => prefix ? [...prefix, tag] : [tag]))),

    parsed: ƒ.method `spawn.parsed` ((_, spawn, [options]) =>
        o.typeof(options) === "function" ?
            Δ(spawn, Δ.set("parse", options)) :
        o.typeof(options) === "object" &&
        I `Object.hasOwn` (options, "split") ?
            given(({ split } = options) =>
                Δ(spawn, Δ.set("parse",
                    ({ stdout }) => stdout.trim().split(split)))) :
            fail.type (
                `spawn.parsed takes either a function or an ` +
                `object with a split key`))
});



/*,
    cstdio("verbose", ["ignore", "inherit", "inherit"]),
    cstdio("silent", "inherit"),
    cstdio("stderr", [0, process.stderr, process.stderr]));
*/
module.exports = α(spawn, { spawn });
/*
const spawn = ƒ `spawn`
({
    [ƒ.tagged]: ({ callee }, tag) =>
        curry(callee, Δ => Δ.concat `arguments` (argument)),
    [ƒ.untagged]: (_, ...rest) => implementation(...rest),
},
    cstdio("verbose", ["ignore", "inherit", "inherit"]),
    cstdio("silent", "inherit"),
    cstdio("stderr", [0, process.stderr, process.stderr]));
*/

function implementation (...unpartitioned)//command, args, options = { })
{
    const { args: unprefixed, options } = toNormalizedArguments(unpartitioned);
    const { prefix = [], parse = x => x } = options;
    const [command, ...args] = [...prefix, ...unprefixed];
console.log(unpartitioned, toNormalizedArguments(unpartitioned), command, args, options);
    let child = null;
    return Object.assign(new Promise(function (resolve, reject)
    {
        const { captureStdio = true, rejectOnExitCode = true, stdio } = options;
        const captured = { stdout: "", stderr: "" };
        const input =
            typeof options.input === "string" &&
            Readable.from([options.input], { objectMode: false });

        const normalizedStdio = getNormalizedStdio(stdio);
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

function getNormalizedStdio(stdio)
{
    if (typeof stdio === "string")
        return [stdio, stdio, stdio];

    if (Array.isArray(stdio))
        return [].concat(stdio);

    return ["pipe", "pipe", "pipe"];
}
