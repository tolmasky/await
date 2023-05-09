const given = f => f();

const { spawn: spawn_native } = require("child_process");
const { Readable, Stream } = require("stream");

const
{
    I,
    IsArray,
    IsString,
    IsObject,
    IsFunctionObject
} = require("@reified/ecma-262");

const fail = require("@reified/core/fail");

const { α, ø, o } = require("@reified/object");
const ƒ = require("@reified/function");
const Δ = require("@reified/delta");
const update = require("@reified/delta/update");
const Mutation = require("@reified/delta/mutation");
// FIXME: Use a better copy system...
const ArrayCopy = array => [...array];

const ExitCodeError = require("./exit-code-error");

const toNormalizedArguments = original => given((
    flattened = original [I `::Array.prototype.flat`] (Infinity),
    options = ø(...Δ.filter(IsObject)(flattened)),
    args = Δ.filter(IsString)(flattened)) =>
    ({ args, options }));

const toNormalizedStdio = stdio =>
    IsString(stdio) ? [stdio, stdio, stdio] :
    IsArray(stdio) ? ArrayCopy(stdio) :
    ["pipe", "pipe", "pipe"];

const trim = string => string.replace(/^\0+|\0+$/g, "");

const toNormalizedParse = parse =>
    parse === false ?
        parse :
    IsFunctionObject(parse) ?
        parse :
    parse === "stdout" ?
        (({ stdout }) => stdout) :
    parse === "trim" ?
        (({ stdout }) => trim(stdout)) :
    IsObject(parse) &&
    I `Object.hasOwn` (parse, "split") ?
        given(({ split } = parse) =>
            ({ stdout }) => trim(stdout).split(split)) :
        fail.type (
            `The "parse" option can be either false, the string "stdout", ` +
            `the string "trim", an object with a string "split" property, ` +
            `or a function.`);


module.exports = ƒ `spawn`
({
    [ƒ.apply]: (spawn, _, args) =>
        implementation(spawn, ...args),

    for: ƒ `spawn.for`
    ({
        [ƒ.apply]: (_, spawn, prefixes) => update(spawn,
            "prefix",
            Mutation.Update(prefix => prefix ? [...prefix, ...prefixes] : ArrayCopy(prefixes))),

        [ƒ.tag]: (_, spawn, tag) => update(spawn,
            "prefix",
            Mutation.Update(prefix => prefix ? [...prefix, tag] : [tag]))
    }),

    parsed: ƒ.method `spawn.parse` ((_, spawn, [parse]) =>
        update(spawn, "parse", parse)),

    split: ƒ.method `spawn.split` ((_, spawn, [split]) =>
        update(spawn, "parse", { split })),

    get stdout()
    {
        return update(this, "parse", "stdout");
    },

    get trim()
    {
        return update(this, "parse", "trim");
    },

    get spawn()
    {
        return this;
    },

    get verbose()
    {
        return update(this, "stdio", ["ignore", "inherit", "inherit"]);
    },

    get silent()
    {
        return update(this, "stdio", "ignore");
    },

    get stderr()
    {
        return update(this, "stdio", [0, process.stderr, process.stderr]);
    }
});

function implementation (...unpartitioned)
{
    const { args: unprefixed, options } = toNormalizedArguments(unpartitioned);
    const { prefix = [], parse = false } = options;
    const normalizedParse = toNormalizedParse(parse) || (x => x);
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

            resolve(normalizedParse(result));
        });
    }), { process: child });
}

