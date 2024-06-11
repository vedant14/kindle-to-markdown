const fs = require("fs");

const CLIPPING_DELIMITER = "==========";
const BULLET = "-";

convertClippings();

function convertClippings() {
  const fileContents = getFileContents(process.argv[2]);
  const clippings = fileContents.split(CLIPPING_DELIMITER);
  const books = [];

  clippings.forEach((clipping) => addHighlightToBook(clipping, books));

  books.forEach((book) => {
    removeDuplicateHighlights(book);
    const markdownContent = convertToMarkdown(book);
    writeToFile(`${book.title}.md`, markdownContent);
  });
}

function addHighlightToBook(clipping, books) {
  const [bookTitle, info, newline, quote] = clipping.trim().split("\n");

  if (!bookTitle || !info || !quote) {
    return;
  }

  const book = getBookWithTitle(books, bookTitle);

  if (book) {
    book.highlights.push({ info, quote });
  } else {
    books.push({
      title: bookTitle,
      highlights: [{ info, quote }],
    });
  }
}

function convertToMarkdown(book) {
  let markdownString = `# ${book.title}\n\n`;

  // Sort highlights by page number and location start
  book.highlights.sort((a, b) => {
    const [aPage, aLocation] = a.info
      .split("|")[0]
      .split(" ")
      .filter((part) => part);
    const [bPage, bLocation] = b.info
      .split("|")[0]
      .split(" ")
      .filter((part) => part);
    if (aPage !== bPage) {
      return parseInt(aPage) - parseInt(bPage);
    } else {
      return (
        parseInt(aLocation.split("-")[0]) - parseInt(bLocation.split("-")[0])
      );
    }
  });

  let combinedStart = null;
  let combinedEnd = null;

  book.highlights.forEach((highlight, index) => {
    const [pageNumber, locations, timeInfo] = highlight.info
      .split("|")
      .map((part) => part.trim());
    const [start, end] = locations.match(/\d+/g).map((loc) => parseInt(loc));

    if (index === 0) {
      combinedStart = start;
      combinedEnd = end;
    } else {
      if (start <= combinedEnd) {
        combinedEnd = Math.max(combinedEnd, end);
      } else {
        // Print the previous combined range only if it's not empty
        if (combinedStart !== null && combinedEnd !== null) {
          markdownString += `${BULLET} Location Start: ${combinedStart}\n`;
          markdownString += `${BULLET} Location End: ${combinedEnd}\n`;
          markdownString += "===================\n";
        }

        // Start a new combined range
        combinedStart = start;
        combinedEnd = end;
      }
    }

    // Constructing the formatted info string
    const quoteUpper =
      highlight.quote.charAt(0).toUpperCase() + highlight.quote.slice(1);
    if (highlight.quote.trim() !== "") {
      markdownString += `${BULLET} **${quoteUpper}** \n`;
      markdownString += `${BULLET} Page Number: ${pageNumber}\n`;
      markdownString += `${BULLET} Time: ${timeInfo}\n`;
    }
  });

  // Print the final combined range only if it's not empty
  if (combinedStart !== null && combinedEnd !== null) {
    markdownString += `${BULLET} Location Start: ${combinedStart}\n`;
    markdownString += `${BULLET} Location End: ${combinedEnd}\n`;
    markdownString += "===================\n";
  }

  return markdownString;
}

function removeDuplicateHighlights(book) {
  const uniqueHighlights = [];
  const seenQuotes = new Set();

  book.highlights.forEach((highlight) => {
    if (!seenQuotes.has(highlight.quote)) {
      uniqueHighlights.push(highlight);
      seenQuotes.add(highlight.quote);
    }
  });

  book.highlights = uniqueHighlights;
}

function getBookWithTitle(books, bookTitle) {
  return books.find((book) => book.title === bookTitle);
}

function getFileContents(filePath) {
  console.log(`Processing file "${filePath}"...`);
  return fs.readFileSync(filePath, "utf8");
}

function writeToFile(filePath, fileContent) {
  fs.writeFile(filePath, fileContent, function (err) {
    if (err) {
      return console.log(err);
    }
    console.log(`${filePath} written successfully.`);
  });
}
