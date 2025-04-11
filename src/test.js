import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000"); // Connect to the backend WebSocket server

const App = () => {
  const [photos, setPhotos] = useState(() => {
    const storedPhotos = localStorage.getItem("photos");
    return storedPhotos ? JSON.parse(storedPhotos) : [];
  });
  const [message, setMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For larger photo view

  useEffect(() => {
    localStorage.setItem("photos", JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
    socket.on("processingStarted", () => {
      setLoading(true);
    });

    socket.on("photoProcessed", (data) => {
      setPhotos((prevPhotos) => {
        if (!prevPhotos.includes(data.filename)) {
          return [...prevPhotos, data.filename];
        }
        return prevPhotos;
      });
    });

    socket.on("processingComplete", (data) => {
      setMessage(data.message);
      setLoading(false);
    });

    return () => {
      socket.off("processingStarted");
      socket.off("photoProcessed");
      socket.off("processingComplete");
    };
  }, []);

  const handleEdit = (index) => {
    setEditingIndex(index);
    setNewName(photos[index]);
  };

  const handleSave = async (index) => {
    const oldName = photos[index];
    const updatedPhotos = [...photos];
    updatedPhotos[index] = newName;
    setPhotos(updatedPhotos); // Update the photo list state
    setEditingIndex(null);
    setNewName("");

    try {
      const response = await fetch("http://localhost:5000/api/rename", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldName, newName }),
      });

      const data = await response.json();
      console.log(data.message);

      // Refresh thumbnails by re-fetching the photos from the backend
      const updatedPhotoListResponse = await fetch(
        "http://localhost:5000/api/photos"
      );
      const updatedPhotoList = await updatedPhotoListResponse.json();
      setPhotos(updatedPhotoList.photos);
    } catch (err) {
      console.error("Error renaming file:", err);
    }
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/confirm", {
        method: "POST",
      });
      const data = await response.json();
      alert(data.message);
      setPhotos([]);
      localStorage.removeItem("photos");
      setMessage("");
      setLoading(false);
    } catch (err) {
      console.error("Error confirming:", err);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/api/delete", {
        method: "DELETE",
      });
      const data = await response.json();
      alert(data.message);
      setPhotos([]);
      localStorage.removeItem("photos");
      setMessage("");
      setLoading(false);
    } catch (err) {
      console.error("Error deleting files:", err);
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printableContent = photos.join("\n");
    const newWindow = window.open("", "_blank");
    newWindow.document.write(`
      <html>
        <head>
          <title>הדפס רשימת סריקות</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: right;
              direction: rtl;
            }
            h1 {
              color: #007bff;
              text-align: center;
            }
            p {
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <h1>רשימת סריקות</h1>
          ${photos.map((photo) => `<p>${photo}</p>`).join("")}
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
    newWindow.onafterprint = () => {
      newWindow.close();
    };
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo); // Set the photo to view it larger
  };

  const closePhotoViewer = () => {
    setSelectedPhoto(null); // Close the larger photo view
  };

  return (
    <div className="App">
      <div className="taskbar">
        <nav>
          <a href="#home">בית</a>
          <a href="#about">אודות</a>
          <a href="#contact">צור קשר</a>
        </nav>
        <h1>סריקות</h1>
      </div>

      {loading && (
        <div className="loader">
          <p>טוען... אנא המתן</p>
        </div>
      )}

      <div className="photo-list">
        {photos.map((photo, index) => (
          <div key={index} className="photo-card">
            {/* Always display the photo thumbnail */}
            <img
              src={`http://localhost:5000/${photo}`}
              alt={photo}
              className="photo-thumbnail"
              onClick={() => handlePhotoClick(photo)} // Open larger view
            />

            {editingIndex === index ? (
              <>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <button onClick={() => handleSave(index)}>שמור</button>
              </>
            ) : (
              <>
                <p>{photo}</p>
                <button onClick={() => handleEdit(index)}>ערוך</button>
              </>
            )}
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div className="photo-viewer" onClick={closePhotoViewer}>
          <div className="photo-viewer-content">
            <img
              src={`http://localhost:5000/${selectedPhoto}`}
              alt={selectedPhoto}
              className="large-photo"
            />
          </div>
        </div>
      )}

      <h2>{message}</h2>

      <div className="button-group">
        {photos.length > 0 && (
          <>
            <button className="confirm-button" onClick={handleConfirm}>
              שלח
            </button>
            <button className="print-button" onClick={handlePrint}>
              הדפס
            </button>
            <button className="delete-button" onClick={handleDelete}>
              מחק הכל
            </button>
          </>
        )}
      </div>

      <footer className="footer">
        <p>© 2025 סריקות OKAL. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
};

export default App;
