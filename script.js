document.getElementById('fileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
      readPDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      readDOCX(file);
    } else if (fileType === 'text/plain') {
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileContent = e.target.result;
        scanForPII(fileContent);
      };
      reader.readAsText(file);
    } else if (fileType.startsWith('image/')) {
      readImage(file);
    } else {
      alert("Unsupported file format. Please upload a PDF, Word (.docx), image, or text file.");
    }
  }
});

document.getElementById('uploadAnother').addEventListener('click', function() {
  document.getElementById('fileInput').value = ''; // Clear the file input
  document.getElementById('output').innerHTML = ''; // Clear previous results
});

function readPDF(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    pdfjsLib.getDocument({ data: arrayBuffer }).promise.then(pdf => {
      let textPromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        textPromises.push(pdf.getPage(i).then(page => page.getTextContent()));
      }
      Promise.all(textPromises).then(pages => {
        let text = pages.map(page => page.items.map(item => item.str).join(' ')).join(' ');
        text = cleanText(text); // Clean and preprocess text
        scanForPII(text);
      });
    });
  };
  reader.readAsArrayBuffer(file);
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim(); // Remove extra spaces and trim
}

function scanForPII(text) {
  const patterns = {
    aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    pan: /([A-Z]){5}([0-9]){4}([A-Z]){1}/g,
    drivingLicense: /[A-Z]{2}\d{2} \d{4} \d{7}/g,
    mobile: /\b(?:\+91|0)?[6-9]\d{9}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    name: /\b((Mr\.|Ms\.|Dr\.|Prof\.)\s?[A-Z][a-z]+|[A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g
  };

  let detectedPII = {};

  for (let type in patterns) {
    let matches = text.match(patterns[type]);
    if (matches) {
      detectedPII[type] = matches;
    }
  }

  displayResults(detectedPII);
}

function displayResults(detectedPII) {
  let output = document.getElementById('output');
  output.innerHTML = '';
  
  if (Object.keys(detectedPII).length === 0) {
    output.innerHTML = '<p>No PII found in the document.</p>';
  } else {
    output.innerHTML = '<h3>Detected PII:</h3>';
    for (let type in detectedPII) {
      output.innerHTML += `<p><strong>${type.toUpperCase()}:</strong> ${detectedPII[type].join(', ')}</p>`;
    }
  }
}

function readDOCX(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    mammoth.extractRawText({ arrayBuffer: arrayBuffer })
      .then(function(result) {
        const text = result.value; // Extracted text
        scanForPII(text); // Scan for PII in the extracted text
      })
      .catch(function(err) {
        console.error("Error extracting text from DOCX:", err);
      });
  };
  reader.readAsArrayBuffer(file);
}

function readImage(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const imageData = e.target.result;
    Tesseract.recognize(
      imageData,
      'eng',
      {
        logger: (m) => console.log(m), // Log progress
      }
    ).then(({ data: { text } }) => {
      console.log('Extracted Text:', text);
      scanForPII(text);  // Pass the extracted text to the PII detection function
    }).catch(function(err) {
      console.error("Error performing OCR:", err);
    });
  };
  reader.readAsDataURL(file);
}
