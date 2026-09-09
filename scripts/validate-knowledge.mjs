import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const knowledgeRoot = path.join(projectRoot, "knowledge-base");
const markdownFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(item);
    else if (entry.name.endsWith(".md")) markdownFiles.push(item);
  }
}

walk(knowledgeRoot);

const badLinks = [];
const replacementCharacters = [];
for (const file of markdownFiles) {
  const content = fs.readFileSync(file, "utf8");
  if (content.includes("�")) replacementCharacters.push(file);
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
    const target = match[1];
    if (!/^https?:/i.test(target) && !fs.existsSync(path.resolve(path.dirname(file), target))) {
      badLinks.push(`${path.relative(knowledgeRoot, file)} -> ${target}`);
    }
  }
}

const apiIndex = fs.readFileSync(path.join(knowledgeRoot, "api", "README.md"), "utf8");
const indexedAdminPaths = new Set(
  [...apiIndex.matchAll(/`(\/admin\/[^`]+)`/g)].map((match) => match[1]),
);
const apiClient = fs.readFileSync(path.join(projectRoot, "src", "admin", "api", "client.js"), "utf8");
const clientAdminPaths = new Set(
  [...apiClient.matchAll(/adminPost\("(\/admin\/[^"?]+)"/g)].map((match) => match[1]),
);
const rootAiCalls = [...apiClient.matchAll(/adminPost\("(\/ai\/[^"?]+)"/g)].map((match) => match[1]);
const missingClientMethods = [...indexedAdminPaths].filter((route) => !clientAdminPaths.has(route));

const failures = {
  badLinks,
  replacementCharacters,
  rootAiCalls,
  missingClientMethods,
};

console.log(`Markdown files: ${markdownFiles.length}`);
console.log(`Indexed /admin endpoints: ${indexedAdminPaths.size}`);
console.log(`API client /admin methods: ${clientAdminPaths.size}`);

if (clientAdminPaths.size < indexedAdminPaths.size || Object.values(failures).some((items) => items.length)) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log("Knowledge base and API client validation passed.");
}
