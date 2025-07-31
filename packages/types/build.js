#!/usr/bin/env node

import { execSync } from "child_process"
import fs from "fs"
import path from "path"

// Run TypeScript compiler
console.log("Running TypeScript compiler...")
execSync("tsc", { stdio: "inherit" })

// Fix imports in the generated JavaScript files
console.log("Fixing imports in generated files...")
const distDir = path.join(process.cwd(), "dist")

function processFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8")

  // Replace relative imports without .js extension to include .js
  const updatedContent = content.replace(/(from\s+["'])(\.[^"']+)(["'])/g, (match, prefix, importPath, suffix) => {
    // Skip if already has extension
    if (importPath.endsWith(".js")) return match
    return `${prefix}${importPath}.js${suffix}`
  })

  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent)
    console.log(`Fixed imports in ${path.relative(process.cwd(), filePath)}`)
  }
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      processDirectory(fullPath)
    } else if (entry.name.endsWith(".js")) {
      processFile(fullPath)
    }
  }
}

processDirectory(distDir)
console.log("Build completed successfully!")
