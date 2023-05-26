/**
 * Need because running npm workspaces command `npm run build -w="packages"` defined in package.json does not work in windows
 */

const cmd = process.argv[2];
const directories = process.argv.slice(3);
const optionsArray = directories.map((dir) => ["-w", dir]).flat();

const commandArray = cmd.includes("test")
    ? ["run", cmd, "--if-present"]
    : ["run", cmd];

require("child_process").spawn("npm", commandArray.concat(optionsArray), {
    shell: true,
    cwd: process.cwd(),
    stdio: "inherit",
});
