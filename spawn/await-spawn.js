const given = f => f();

const { spawn: spawn_native } = require("child_process");
const { Readable, Stream } = require("stream");

const I = require("@reified/intrinsics");
const { α, ø, o } = require("@reified/object");
const { ƒ, curry } = require("@reified/function");

const ExitCodeError = require("./exit-code-error");

const toNormalizedArguments = arguments => given((
    flattened = I.Array.prototype.flat.call(arguments),
    count = flattened.length,
    last = count > 0 && flattened[count - 1],
    options = last && o.typeof(last) === "object" && last,
    [command, ...args] = options ? flattened.slice(0, -1) : flattened) =>
    [command, args, ...(options ? [options] : [])]);

//const 𝑝 = require("@reified/promise");

const cstdio = (name, stdio) => Δ => Δ.get (name, self => curry(this, Δ => Δ.fallback `options.stdio` (stdio)))


const spawn = ƒ `spawn`
({
    [ƒ.called]: implementation,
    [ƒ.tagged]: ({ callee }, tag) =>
        curry(callee, Δ => Δ.concat `arguments` (argument))
},
    cstdio("verbose", ["ignore", "inherit", "inherit"]),
    cstdio("silent", "inherit"),
    cstdio("stderr", [0, process.stderr, process.stderr]));
    
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

function implementation (...arguments)//command, args, options = { })
{
    const [command, args, options = { }] = toNormalizedArguments(arguments);
console.log(command, args, options);
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
                return reject(new ExitCodeError(exitCode, result));

            resolve(result);
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