import dns from "node:dns/promises";
import { readFile, writeFile } from 'node:fs/promises';
import batchPromise from 'batch-promises-with-delay';

const resolver = new dns.Resolver({
  timeout: 5000,
  tries: 4,
});

const resolveMx = resolver.resolveMx.bind(resolver);


let count = 0; // This can be our start value in casce things break
const good = (await readFile("good.txt", "utf8")).split("\n");
const dead = (await readFile("dead.txt", "utf8")).split("\n");
const domainTxt = await readFile("../emails.txt", "utf8");
const domains = domainTxt.split("\n").filter(domain => {
  if(!domain) return false;
  if(good.includes(domain)) return false;
  if(dead.includes(domain)) return false;
  return true;
});
console.log(`Loaded ${domains.length} domains.`);

function collect(func) {
  return async function collector(...args) {
    const [result] = await Promise.allSettled([ func(...args) ]);
    return [result.reason, result.value]
  }
}

async function checkDomain(domain) {
  const [err, result] = await collect(resolveMx)(domain);
  if(err || result?.length === 0) {
    if(err?.code === 'ETIMEOUT') {
      console.log(`⏳ ${domain}:`, err?.code);
      good.push(domain);
      return;
    }
    console.log(`❌ ${domain}:`, err?.code || 'No MX records');
    dead.push(domain);
    return;
  }
  console.log(`✅ ${domain}: ${result.length} records`);
  good.push(domain);
}

const promises = domains.map(domain => ({ func: checkDomain, args: [domain] }));

console.log(`Created ${promises.length} promises`)

await batchPromise(promises, {
  batchSize: 150,
  delayBetweenBatches: 2000,
  async onBatchEnd() {
    console.log(`💾 Batch done, saving...`);
    await save();
  }
});

async function save() {
  await Promise.all([writeFile('good.txt', good.join('\n')),writeFile('dead.txt', dead.join('\n'))]);
}

console.log(`
Good: ${good.length}
Dead: ${dead.length}
`);
