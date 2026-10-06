// Copies the Hindi / Gujarati dictionaries to the cloud, which translates
// push notifications with them (uat-backend-v2/ownerv1/i18n.js). Run after
// every dictionary change, then commit both repos:
//   node scripts/copy-dicts-to-cloud.cjs           copy
//   node scripts/copy-dicts-to-cloud.cjs --check   exit 1 if the copies differ
const fs = require("fs");
const path = require("path");

const FROM = path.resolve(__dirname, "../src/lib/i18n");
const TO = path.resolve(__dirname, "../../../uat-backend-v2/ownerv1/i18n");
const check = process.argv.includes("--check");
let differ = 0;
if (!check) fs.mkdirSync(TO, { recursive: true });
for (const f of ["hi.json", "gu.json"]) {
  const src = fs.readFileSync(path.join(FROM, f), "utf8");
  const dst = path.join(TO, f);
  const same = fs.existsSync(dst) && fs.readFileSync(dst, "utf8") === src;
  if (check) {
    if (!same) {
      differ += 1;
      console.log(`${f}: the cloud copy is out of date`);
    }
  } else {
    fs.writeFileSync(dst, src);
    console.log(`${f} -> ${dst}`);
  }
}
if (check) console.log(differ ? "run: node scripts/copy-dicts-to-cloud.cjs" : "cloud copies are up to date");
process.exit(check && differ ? 1 : 0);
