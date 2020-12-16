const readline = require("readline");
const {
  promises: { resolveMx },
} = require("dns");

// Read all lines from stdin (assuming each line is a domain)
const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});
const domains = [];
rl.on("line", (line) => {
  domains.push(line);
});
rl.on("close", checkDomains);

async function checkDomains() {
  const failedDomains = [];
  console.log(`Checking ${domains.length} domains`);
  for (const domain of domains) {
    try {
      await resolveMx(domain);
    } catch (error) {
      failedDomains.push(domain);
    }
  }

  if (failedDomains.length !== 0) {
    console.log("These domains does not have any active MX records:");
    console.log(failedDomains.join("\n"));
  }
}
