const fs = require("fs");
const path = require("path");

// Define paths
const srcPath = path.join(__dirname, "..", "README.md");
const destPath = path.join(__dirname, "..", "public", "README.md");

// Copy the file
try {
  // Ensure the destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Read the source file and write to destination
  const content = fs.readFileSync(srcPath, "utf8");
  fs.writeFileSync(destPath, content, "utf8");

  console.log("Successfully copied README.md to public folder");
} catch (error) {
  console.error("Error copying README.md:", error);
  process.exit(1);
}
