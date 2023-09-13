#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// Get folder path and output folder from command-line arguments
let [, , folderPath, fit="contain", outputFolder = folderPath, devicesFilePath] = process.argv;

if (!folderPath || !outputFolder) {
	console.error("Usage: node screenshots.js [folderPath] [outputFolder] [devicesFilePath: a json file : [{name, width, height}]]");
	process.exit(1);
}
cwd = process.cwd();

folderPath = path.resolve(cwd, folderPath);
outputFolder = path.resolve(cwd, outputFolder);
if(devicesFilePath){
	devicesFilePath=path.resolve(cwd, outputFolder);
}

console.info(`converting all images in ${folderPath} to ${outputFolder}`);

const iosDevices =  devicesFilePath ? require(devicesFilePath) : [
	{ name: 'iPhone 6.5"', width: 1284, height: 2778 },
	{ name: 'iPhone 5.5"', width: 1242, height: 2208 },
	{ name: 'iPad Pro 12.9" (6th Gen)', height: 2732, width: 2048 },
	{ name: 'iPad Pro 12.9" (2nd Gen)', height: 2732, width: 2048 },
];

// Function to create the output folder if it doesn't exist
function createOutputFolder() {
	if (!fs.existsSync(outputFolder)) {
		fs.mkdirSync(outputFolder);
	}
}

// Function to resize an image for a given device
async function resizeImage(imagePath, device, outputFolder) {
	try {
		const deviceFolder = path.join(outputFolder, device.name);
		if (!fs.existsSync(deviceFolder)) {
			fs.mkdirSync(deviceFolder);
		}
		const resizedImagePath = path.join(deviceFolder, imagePath);
		try {
			await sharp(path.join(folderPath, imagePath))
				.resize(device.width, device.height, {fit})
				.toFile(resizedImagePath);
			console.log(`Image resized for ${device.name}: ${resizedImagePath}`);
		} catch (e) {}
		
	} catch (error) {
		console.error(`Error resizing image for ${device.name}:`, error);
	}
}

// Function to resize images for all devices
async function resizeImagesForDevices() {
	try {
		createOutputFolder();
		const files = await fs.promises.readdir(folderPath);
		for (const file of files) {
			if (!fs.statSync(path.join(folderPath, file)).isFile()) continue;
			for (const device of iosDevices) {
				await resizeImage(file, device, outputFolder);
			}
		}
	} catch (error) {
		console.error("Error loading images:", error);
	}
}

// Call the function to resize images for all devices
resizeImagesForDevices();
