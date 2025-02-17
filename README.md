# dax

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https/deno.land/x/dax/mod.ts)

Cross platform shell tools for Deno inspired by [zx](https://github.com/google/zx).

Differences:

1. Minimal globals or global configuration.
   - Only a default instance of `$`, but it's not mandatory to use this.
1. No custom CLI.
1. Cross platform shell to help the code work on Windows.
   - Uses [deno_task_shell](https://github.com/denoland/deno_task_shell)'s parser.
   - Allows exporting the shell's environment to the current process.
1. Good for application code in addition to use as a shell script replacement.
1. Named after my cat.

## Executing commands

```ts
import $ from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";

// run a command
await $`echo 5`; // outputs: 5

// more complex example outputting 1 to stdout and 2 to stderr
await $`echo 1 && deno eval 'console.error(2);'`;
```

### Getting output

Get the stdout of a command (makes stdout "quiet"):

```ts
const result = await $`echo 1`.text();
console.log(result); // 1
```

Get the result of stdout as json (makes stdout "quiet"):

```ts
const result = await $`echo '{ "prop": 5 }'`.json();
console.log(result.prop); // 5
```

Get the result of stdout as bytes (makes stdout "quiet"):

```ts
const result = await $`echo 'test'`.bytes();
console.log(result); // Uint8Array(5) [ 116, 101, 115, 116, 10 ]
```

Get the result of stdout as a list of lines (makes stdout "quiet"):

```ts
const result = await $`echo 1 && echo 2`.lines();
console.log(result); // ["1", "2"]
```

Working with a lower level result that provides more details:

```ts
const result = await $`deno eval 'console.log(1); console.error(2);'`
  .stdout("piped")
  .stderr("piped");
console.log(result.code); // 0
console.log(result.stdoutBytes); // Uint8Array(2) [ 49, 10 ]
console.log(result.stdout); // 1\n
console.log(result.stderr); // 5\n
const output = await $`echo '{ "test": 5 }'`.stdout("piped");
console.log(output.stdoutJson);
```

### Providing arguments to a command

Use an expression in a template literal to provide a single argument to a command:

```ts
const dirName = "some_dir";
await $`mkdir ${dirName}`; // executes as: mkdir some_dir
```

Arguments are escaped so strings with spaces get escaped and remain as a single argument:

```ts
const dirName = "Dir with spaces";
await $`mkdir ${dirName}`; // executes as: mkdir 'Dir with spaces'
```

Alternatively, provide an array for multiple arguments:

```ts
const dirNames = ["some_dir", "other dir"];
await $`mkdir ${dirNames}`; // executes as: mkdir some_dir 'other dir'
```

If you do not want to escape arguments in a template literal, you can opt out completely, by using `$.raw`:

```ts
const args = "arg1   arg2   arg3";
await $.raw`echo ${args}`; // executes as: echo arg1   arg2   arg3
```

Providing stdout of one command to another is possible as follows:

```ts
// Note: This will read trim the last newline of the other command's stdout
const result = await $`echo 1`.stdout("piped"); // need to set stdout as piped for this to work
const finalText = await $`echo ${result}`.text();
console.log(finalText); // 1
```

...though it's probably a lot easier to just collect all the text of a command and provide that:

```ts
// alternatively though, calling `.text()` like so is probably easier
const result = await $`echo 1`.text();
const finalText = await $`echo ${result}`.text();
console.log(finalText); // 1
```

### Providing stdin

```ts
await $`command`.stdin("some value");
await $`command`.stdin(new Uint8Array[1, 2, 3, 4]());
await $`command`.stdin(someReader);
```

### Setting environment variables

Done via the `.env(...)` method:

```ts
// outputs: 1 2 3 4
await $`echo $var1 $var2 $var3 $var4`
  .env("var1", "1")
  .env("var2", "2")
  // or use object syntax
  .env({
    var3: "3",
    var4: "4",
  });
```

### Setting cwd for command

Use `.cwd("new_cwd_goes_here")`:

```ts
// outputs that it's in the someDir directory
await $`deno eval 'console.log(Deno.cwd());'`.cwd("./someDir");
```

### Silencing a command

Makes a command not output anything to stdout and stderr if set to `"inherit"` or `"inheritPiped"`.

```ts
await $`echo 5`.quiet();
await $`echo 5`.quiet("stdout"); // or just stdout
await $`echo 5`.quiet("stderr"); // or just stderr
```

### Output a command before executing it

The following code:

```ts
const text = "example";
await $`echo ${text}`.printCommand();
```

Outputs the following (with the command text in blue):

```ts
> echo example
example
```

#### Enabling on a `$`

Like with any default in Dax, you can build a new `$` turning on this option so this will occur with all commands (see [Custom `$`](#custom-)).

That said, since enabling this has a low change of breaking downstream code, you can mutate a `$` to enable it by calling `$.setPrintCommand(true);`.

```ts
$.setPrintCommand(true);

const text = "example";
await $`echo ${text}`; // will output `> echo example` before running the command
```

### Timeout a command

```ts
// timeout a command after a specified time
await $`some_command`.timeout("1s");
```

### Exporting the environment of the shell to JavaScript

When executing commands in the shell, the environment will be contained to the shell and not exported to the current process. For example:

```ts
await $`cd src && export MY_VALUE=5`;
// will output nothing
await $`echo $MY_VALUE`;
// will both NOT output it's in the src dir
await $`echo $PWD`;
console.log(Deno.cwd());
```

You can change that by using `exportEnv()` on the command:

```ts
await $`cd src && export MY_VALUE=5`.exportEnv();
// will output "5"
await $`echo $MY_VALUE`;
// will both output it's in the src dir
await $`echo $PWD`;
console.log(Deno.cwd());
```

## Logging

Dax comes with some helper functions for logging:

```ts
// logs with potential indentation
// Note: everything is logged over stderr by default
$.log("Hello!");
// log with the first word as bold green
$.logStep("Fetching data from server...");
// or force multiple words to be green by using two arguments
$.logStep("Setting up", "local directory...");
// similar to $.logStep, but with red
$.logError("Error Some error message.");
// similar to $.logStep, but with yellow
$.logWarn("Warning Some warning message.");
// logs out text in gray
$.logLight("Some unimportant message.");
```

You may wish to indent some text when logging, use `$.logGroup` to do so:

```ts
// log indented within (handles de-indenting when an error is thrown)
await $.logGroup(async () => {
  $.log("This will be indented.");
  await $.logGroup(async () => {
    $.log("This will indented even more.");
    // do maybe async stuff here
  });
});

// or use $.logGroup with $.logGroupEnd
$.logGroup();
$.log("Indented 1");
$.logGroup("Level 2");
$.log("Indented 2");
$.logGroupEnd();
$.logGroupEnd();
```

As mentioned previously, Dax logs to stderr for everything by default. This may not be desired, so you can change the current behaviour of a `$` object by setting a logger for either "info", "warn", or "error".

```ts
// Set the loggers. For example, log everything
// on stdout instead of stderr
$.setInfoLogger(console.log);
$.setWarnLogger(console.log);
$.setErrorLogger(console.log);

// or a more advanced scenario
$.setInfoLogger((...args: any[]) => {
  console.error(...args);
  // write args to a file here...
};)
```

## Helper functions

Changing the current working directory of the current process:

```ts
$.cd("someDir");
console.log(Deno.cwd()); // will be in someDir directory
```

Checking if a path exists:

```ts
// Note: beware of "time of check to time of use" race conditions when using this
await $.exists("./file.txt");
$.existsSync("./file.txt");
```

Sleeping asynchronously for a specified amount of time:

```ts
await $.sleep(100); // ms
await $.sleep("1.5s");
await $.sleep("100ms");
```

Getting path to an executable based on a command name:

```ts
console.log(await $.which("deno")); // outputs the path to deno executable
```

Attempting to do an action until it succeeds or hits the maximum number of retries:

```ts
await $.withRetries({
  count: 5,
  // you may also specify an iterator here which is useful for exponential backoff
  delay: "5s",
  action: async () => {
    await $`cargo publish`;
  },
});
```

Re-export of deno_std's path:

```ts
$.path.basename("./deno/std/path/mod.ts"); // mod.ts
```

Re-export of deno_std's fs:

```ts
for await (const file of $.fs.expandGlob("**/*.ts")) {
  console.log(file);
}
```

## Making requests

Dax ships with a slightly less verbose wrapper around `fetch` that will throw by default on non-`2xx` status codes (this is configurable per status code).

Download a file as JSON:

```ts
const data = await $.request("https://plugins.dprint.dev/info.json").json();
console.log(data.plugins);
```

Or as text:

```ts
const text = await $.request("https://example.com").text();
```

Or get the long form:

```ts
const response = await $.request("https://plugins.dprint.dev/info.json");
console.log(response.code);
console.log(await response.json());
```

See the [documentation on `RequestBuilder`](https://doc.deno.land/https/deno.land/x/dax/mod.ts) for more details. It should be as flexible as `fetch`, but uses a builder API (ex. set headers via `.header(...)`).

## Shell

The shell is cross platform and uses the parser from [deno_task_shell](https://github.com/denoland/deno_task_shell).

Sequential lists:

```ts
// result will contain the directory in someDir
const result = await $`cd someDir ; deno eval 'console.log(Deno.cwd())'`;
```

Boolean lists:

```ts
// outputs to stdout with 1\n\2n
await $`echo 1 && echo 2`;
// outputs to stdout with 1\n
await $`echo 1 || echo 2`;
```

Setting env var for command in the shell (generally you can just use `.env(...)` though):

```ts
// result will contain the directory in someDir
const result = await $`test=123 deno eval 'console.log(Deno.env.get('test'))'`;
console.log(result.stdout); // 123
```

Shell variables (these aren't exported):

```ts
// the 'test' variable WON'T be exported to the sub processes, so
// that will print a blank line, but it will be used in the final echo command
await $`test=123 && deno eval 'console.log(Deno.env.get('test'))' && echo $test`;
```

Env variables (these are exported):

```ts
// the 'test' variable WILL be exported to the sub processes and
// it will be used in the final echo command
await $`export test=123 && deno eval 'console.log(Deno.env.get('test'))' && echo $test`;
```

Variable substitution:

```ts
const result = await $`echo $TEST`.env("TEST", "123").text();
console.log(result); // 123
```

### Custom Cross Platform Shell Commands

Currently implemented (though not every option is supported):

- [`cd`](https://man7.org/linux/man-pages/man1/cd.1p.html) - Change directory command.
  - Note that shells don't export their environment by default.
- [`echo`](https://man7.org/linux/man-pages/man1/echo.1.html) - Echo command.
- [`exit`](https://man7.org/linux/man-pages/man1/exit.1p.html) - Exit command.
- [`sleep`](https://man7.org/linux/man-pages/man1/sleep.1.html) - Sleep command.
- [`test`](https://man7.org/linux/man-pages/man1/test.1.html) - Test command.
- More to come. Will try to get a similar list as https://deno.land/manual/tools/task_runner#built-in-commands

You can also register your own commands with the shell parser (see below).

## Builder APIs

The builder APIs are what the library uses internally and they're useful for scenarios where you want to re-use some setup state. They're immutable so every function call returns a new object (which is the same thing that happens with the objects returned from `$` and `$.request`).

### `CommandBuilder`

`CommandBuilder` can be used for building up commands similar to what the tagged template `$` does:

```ts
import {
  CommandBuilder,
} from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";

const commandBuilder = new CommandBuilder()
  .cwd("./subDir")
  .stdout("inheritPiped") // output to stdout and pipe to a buffer
  .noThrow();

const otherBuilder = commandBuilder
  .stderr("null");

const result = await commandBuilder
  // won't have a null stderr
  .command("deno run my_script.ts")
  .spawn();

const result2 = await otherBuilder
  // will have a null stderr
  .command("deno run my_script.ts")
  .spawn();
```

You can also register your own custom commands using the `registerCommand` or `registerCommands` methods:

```ts
const commandBuilder = new CommandBuilder()
  .registerCommand(
    "true",
    () => Promise.resolve({ kind: "continue", code: 0 }),
  );

const result = await commandBuilder
  // now includes the 'true' command
  .command("true && echo yay")
  .spawn();
```

### `RequestBuilder`

`RequestBuilder` can be used for building up requests similar to `$.request`:

```ts
import {
  RequestBuilder,
} from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";

const requestBuilder = new RequestBuilder()
  .header("SOME_VALUE", "some value to send in a header");

const result = await requestBuilder
  .url("https://example.com")
  .text();
```

### Custom `$`

You may wish to create your own `$` function that has a certain setup context (for example, custom commands, a defined environment variable or cwd). You may do this by using the exported `build$` with `CommandBuilder` and/or `RequestBuilder`, which is essentially what the main default exported `$` uses internally to build itself:

```ts
import {
  build$,
  CommandBuilder,
  RequestBuilder,
} from "https://deno.land/x/dax@VERSION_GOES_HERE/mod.ts";

const commandBuilder = new CommandBuilder()
  .cwd("./subDir")
  .env("HTTPS_PROXY", "some_value");
const requestBuilder = new RequestBuilder()
  .header("SOME_NAME", "some value");

// creates a $ object with the starting environment as shown above
const $ = build$({ commandBuilder, requestBuilder });

// this command will use the env described above, but the main
// process won't have its environment changed
await $`deno run my_script.ts`;

const data = await $.request("https://plugins.dprint.dev/info.json").json();
```

This may be useful also if you want to change the default configuration. Another example:

```ts
const commandBuilder = new CommandBuilder()
  .exportEnv()
  .noThrow();

const $ = build$({ commandBuilder });

// since exportEnv() was set, this will now actually change
// the directory of the executing process
await $`cd test && export MY_VALUE=5`;
// will output "5"
await $`echo $MY_VALUE`;
// will output it's in the test dir
await $`echo $PWD`;
// won't throw even though this command fails (because of `.noThrow()`)
await $`deno eval 'Deno.exit(1);'`;
```

#### Building `$` from another `$`

You can build a `$` from another `$` by calling `$.build$({ /* options go here */ })`.

This might be useful in scenarios where you want to use a `$` with a custom logger.

```
const local$ = $.build$();
local$.setInfoLogger((...args: any[]) => {
  // a more real example might be logging to a file
  console.log("Logging...");
  console.log(...args);
});
local$.log("Hello!");
```

Outputs:

```
Logging...
Hello!
```
