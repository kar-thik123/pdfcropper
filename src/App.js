import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [croppedPdfBlob, setCroppedPdfBlob] = useState(null);
  const [cropMode, setCropMode] = useState(false);
  const overlayRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setDimensions(null);
      setCroppedPdfBlob(null);
      setCropMode(false);
    }
  };

  const handleMouseDown = (e) => {
    if (cropMode && !isCropping) {
      e.preventDefault();
      const overlay = overlayRef.current;
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setStartPoint({ x, y });
      setIsCropping(true);

      // Create initial selection
      setDimensions({
        width: 0,
        height: 0,
        x,
        y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (cropMode && isCropping && startPoint) {
      e.preventDefault();
      const overlay = overlayRef.current;
      const rect = overlay.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const width = currentX - startPoint.x;
      const height = currentY - startPoint.y;

      setDimensions({
        width: Math.abs(width),
        height: Math.abs(height),
        x: width > 0 ? startPoint.x : currentX,
        y: height > 0 ? startPoint.y : currentY
      });
    }
  };

  const handleMouseUp = (e) => {
    if (isCropping) {
      e.preventDefault();
      setIsCropping(false);
      setStartPoint(null);
    }
  };

  const handleCrop = async () => {
    if (!selectedFile || !dimensions) {
      alert('Please select a PDF file and create a crop area');
      return;
    }

    try {
      const fileData = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileData);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      const containerRect = containerRef.current.getBoundingClientRect();
      const pdfWidth = firstPage.getWidth();
      const pdfHeight = firstPage.getHeight();
      
      const scaleFactor = pdfWidth / containerRect.width;
      
      const pdfX = dimensions.x * scaleFactor;
      const pdfY = pdfHeight - ((dimensions.y + dimensions.height) * scaleFactor);
      const pdfCropWidth = dimensions.width * scaleFactor;
      const pdfCropHeight = dimensions.height * scaleFactor;

      firstPage.setCropBox(pdfX, pdfY, pdfCropWidth, pdfCropHeight);

      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      setCroppedPdfBlob(blob);
      setCropMode(false);
      
      alert('PDF cropped successfully! Click Download to save the file.');
    } catch (error) {
      console.error('Error cropping PDF:', error);
      alert('Error cropping PDF. Please try again.');
    }
  };

  const handleDownload = () => {
    if (croppedPdfBlob) {
      const url = URL.createObjectURL(croppedPdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cropped-pdf.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Please crop the PDF first before downloading.');
    }
  };

  const resetCrop = () => {
    setDimensions(null);
    setCroppedPdfBlob(null);
    setCropMode(false);
  };

  const startCrop = () => {
    setCropMode(true);
    setDimensions(null);
    setCroppedPdfBlob(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>PDF Crop Tool</h1>
        
        <div className="input-section">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
          />
          {selectedFile && !cropMode && (
            <button 
              className="start-crop-btn" 
              onClick={startCrop}
            >
              Start Crop
            </button>
          )}
        </div>

        {cropMode && (
          <div className="crop-instructions">
            Click and drag on the PDF to select crop area
          </div>
        )}

        <div 
          className={`pdf-container ${cropMode ? 'crop-mode' : ''}`}
          ref={containerRef}
        >
          {pdfUrl && (
            <>
              <embed 
                src={pdfUrl} 
                type="application/pdf"
                className="pdf-preview"
                style={{ transform: `scale(${scale})` }}
              />
              <div 
                ref={overlayRef}
                className="pdf-overlay"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {dimensions && (
                  <div
                    className="selection-area"
                    style={{
                      left: `${dimensions.x}px`,
                      top: `${dimensions.y}px`,
                      width: `${dimensions.width}px`,
                      height: `${dimensions.height}px`
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="controls">
          {cropMode && dimensions && (
            <button onClick={handleCrop} disabled={!selectedFile || !dimensions}>
              Apply Crop
            </button>
          )}
          <button onClick={handleDownload} disabled={!croppedPdfBlob}>
            Download
          </button>
          {cropMode && (
            <button onClick={resetCrop}>
              Cancel
            </button>
          )}
          <div className="zoom-controls">
            <button onClick={() => setScale(scale + 0.1)}>Zoom In</button>
            <button onClick={() => setScale(Math.max(0.1, scale - 0.1))}>Zoom Out</button>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
