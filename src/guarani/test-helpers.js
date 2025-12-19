import fs from "node:fs";
import path from "node:path";

/**
 * Loads an HTML fixture file and sets it in the document.
 * Automatically resolves the fixture path based on the test name structure.
 *
 * Test names follow the pattern: "describe.block.name test name"
 * Fixtures are stored in: testFileDir/__fixtures__/describe/block/name/test_name.html
 *
 * @param {object} options - Configuration options
 * @param {string} options.testName - The full test name from Jest (expect.getState().currentTestName)
 * @param {string} options.testFileDir - The directory of the test file (import.meta.dirname)
 */
export function loadFixture({testName, testFileDir}) {
	// Split test name into describe block and test name
	// Pattern: "describe.block.name test name" where describe block has no spaces
	const parts = testName.split(" ");
	const describeBlock = parts[0]; // e.g., "pagesDataParser.getStudentId"
	const testNamePart = parts.slice(1).join("_"); // e.g., "successful_parsing"

	// Convert describe block dots to path separators
	// e.g., "pagesDataParser.getStudentId" -> "pagesDataParser/getStudentId"
	const describeBlockPath = describeBlock.replaceAll(".", path.sep);

	// Construct the full fixture path
	const fileName = testNamePart + '.html';
	const fixturesDir = path.join(testFileDir, '__fixtures__', describeBlockPath);
	const filePath = path.join(fixturesDir, fileName);

	// Read the fixture file
	const htmlContent = fs.readFileSync(filePath, 'utf8');

	// Extract body content without executing scripts
	const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
	if (!bodyMatch) throw new Error(`Could not find body tag in ${fileName}`);

	document.body.innerHTML = bodyMatch[1];
}
