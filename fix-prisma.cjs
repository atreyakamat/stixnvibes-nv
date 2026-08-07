const fs = require('fs');
const path = './prisma/schema.prisma';
let content = fs.readFileSync(path, 'utf8');

// add multiSchema configuration
content = content.replace(/generator client\s*\{[^}]*\}/, `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}`);

content = content.replace(/datasource db\s*\{[^}]*\}/, `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas   = ["public", "auth"]
}`);

const lines = content.split('\n');
let insideBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('model ') || line.startsWith('enum ')) {
    insideBlock = true;
  }
  
  if (line === '@@schema("public")' || line === '@@schema("auth")') {
    // If it already has a schema, we don't need to add one.
    // wait, we can just strip them all first to ensure clean state?
  }
}

// Safer approach: replace all existing @@schema lines first
let cleanContent = lines.filter(l => !l.trim().startsWith('@@schema(')).join('\n');

const cleanLines = cleanContent.split('\n');
let newLines = [];
let inside = false;

for (let i = 0; i < cleanLines.length; i++) {
  const line = cleanLines[i].trim();
  if (line.startsWith('model ') || line.startsWith('enum ')) {
    inside = true;
  }
  
  if (line === '}' && inside) {
    // Add @@schema before the closing bracket. 
    // Since we filtered all @@schema out, we know it's safe.
    // However, what if it's the `auth.users` model? It should be "auth"
    // For now we'll assume all our models are "public", except auth ones? 
    // `db pull` will pull `admin_users` but it's in public. 
    // `auth.users` might be pulled into the schema.
    newLines.push('  @@schema("public")');
    inside = false;
  }
  newLines.push(cleanLines[i]);
}

// But wait! If we do `db pull`, Prisma brings in `auth.users` as `model users { ... @@schema("auth") }`.
// If we overwrite it with "public", it breaks.
fs.writeFileSync(path, newLines.join('\n'), 'utf8');
