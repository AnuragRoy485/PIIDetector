document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const fileType = file.type;

      if (fileType === "application/pdf") {
        // Handle PDF file
        readPDF(file);
      } else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        // Handle Word (.docx) file
        readDOCX(file);
      } else if (fileType === "text/plain") {
        // Handle plain text file
        const reader = new FileReader();
        reader.onload = function (e) {
          const fileContent = e.target.result;
          scanForPII(fileContent);
        };
        reader.readAsText(file);
      } else if (fileType.startsWith("image/")) {
        // Handle image file (jpg, png, etc.)
        readImage(file);
      } else {
        alert(
          "Unsupported file format. Please upload a PDF, Word (.docx), image, or text file."
        );
      }
    }
  });

function readPDF(file) {
  // Implement PDF reading logic here
}

function readDOCX(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const arrayBuffer = e.target.result;
    mammoth
      .extractRawText({ arrayBuffer: arrayBuffer })
      .then(function (result) {
        const text = result.value; // Extracted text
        scanForPII(text); // Scan for PII in the extracted text
      })
      .catch(function (err) {
        console.error("Error extracting text from DOCX:", err);
      });
  };
  reader.readAsArrayBuffer(file);
}

function readImage(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const imageData = e.target.result;
    Tesseract.recognize(imageData, "eng", {
      logger: (m) => console.log(m) // Log progress
    })
      .then(({ data: { text } }) => {
        console.log("Extracted Text:", text);
        scanForPII(text); // Pass the extracted text to the PII detection function
      })
      .catch(function (err) {
        console.error("Error performing OCR:", err);
      });
  };
  reader.readAsDataURL(file);
}

function scanForPII(text) {
  const patterns = {
    aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g, // Aadhaar number (12 digits with or without spaces)
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g, // US Social Security Number (SSN format)
    pan: /([A-Z]){5}([0-9]){4}([A-Z]){1}/g, // Indian PAN format
    drivingLicense: /[A-Z]{2}\d{2} \d{4} \d{7}/g, // Example for Indian Driving License
    mobile: /\b(?:\+91|0)?[6-9]\d{9}\b/g, // Indian mobile numbers (10 digits starting with 6-9)
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    name: /\b((Mr\.|Ms\.|Dr\.|Prof\.)\s?[A-Z][a-z]+|[A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g // Refined name detection
  };

  let detectedPII = {};

  // Detect PII using regex patterns
  for (let type in patterns) {
    let matches = text.match(patterns[type]);
    if (matches) {
      detectedPII[type] = matches;
    }
  }

  displayResults(detectedPII);
}

// Display the detected PII in the output section
function displayResults(detectedPII) {
  let output = document.getElementById("output");
  output.innerHTML = ""; // Clear previous results

  if (Object.keys(detectedPII).length === 0) {
    output.innerHTML = "<p>No PII found in the document.</p>";
  } else {
    output.innerHTML = "<h3>Detected PII:</h3>";
    for (let type in detectedPII) {
      output.innerHTML += `<p><strong>${type.toUpperCase()}:</strong> ${detectedPII[
        type
      ].join(", ")}</p>`;
    }
  }
}
