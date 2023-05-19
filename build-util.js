/**
 * Need because running npm workspaces command `npm run build -w="packages"` defined in package.json does not work in windows
 */

const directories = process.argv.slice(2);
const optionsArray = directories.map((dir) => ["-w", dir]).flat();

require("child_process").spawn("npm", ["run", "build"].concat(optionsArray), {
    shell: true,
    cwd: process.cwd(),
    stdio: "inherit",
});
