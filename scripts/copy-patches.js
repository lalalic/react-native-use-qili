const fs = require('fs');
const path = require('path');

function copyFolder(sourceFolder, destinationFolder) {
  // Create the destination folder if it doesn't exist
  if (!fs.existsSync(destinationFolder)) {
    fs.mkdirSync(destinationFolder);
  }

  // Read the contents of the source folder
  const files = fs.readdirSync(sourceFolder);

  // Loop through each file in the source folder
  files.forEach((file) => {
    const sourcePath = path.join(sourceFolder, file);
    const destinationPath = path.join(destinationFolder, file);

    // Check if the current item is a file or a subdirectory
    const isFile = fs.statSync(sourcePath).isFile();

    if (isFile) {
      // If it's a file, copy it to the destination folder
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`Copied ${file} to ${destinationFolder}.`);
    } else {
      // If it's a subdirectory, recursively call the copyFolder function
      copyFolder(sourcePath, destinationPath);
    }
  });
}

function addPostInstall(){
  const pathPkg=path.resolve(process.cwd(), "package.json")
  const pkg=require(pathPkg)
  pkg.scripts.postinstall="patch-package"
  fs.writeFileSync(pathPkg, JSON.stringify(pkg, null, 4))
}

// Usage example:
const sourceFolder = path.resolve(__dirname, "../patches");
const destinationFolder = path.resolve(process.cwd(),"patches")

copyFolder(sourceFolder, destinationFolder);
