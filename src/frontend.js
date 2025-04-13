import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";
import searchIcon from "../src/assests/search.png";

const backendURL = "http://localhost:5000";
// const backendURL = "http://192.168.2.88:9000";
const socket = io(backendURL); // Connect to the backend WebSocket server

const App = () => {
  const [photos, setPhotos] = useState(() => {
    const storedPhotos = localStorage.getItem("photos");
    return storedPhotos ? JSON.parse(storedPhotos) : [];
  });
  const [message, setMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [newName, setNewName] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For larger photo view
  const [notification, setNotification] = useState(""); // For self-disappearing messages

  useEffect(() => {
    localStorage.setItem("photos", JSON.stringify(photos));
  }, [photos]);

  useEffect(() => {
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
    });

    return () => {
      socket.off("photoProcessed");
      socket.off("processingComplete");
    };
  }, []);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => {
      setNotification("");
    }, 3000); // 3 seconds delay
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setNewName(photos[index]);
  };

  const handleSave = async (index) => {
    const oldName = photos[index];

    // Avoid unnecessary API call if the old name equals the new name
    if (oldName === newName) {
      setEditingIndex(null); // Exit edit mode
      setNewName("");
      return;
    }

    const updatedPhotos = [...photos];
    updatedPhotos[index] = newName;
    setPhotos(updatedPhotos); // Update the photo list state
    setEditingIndex(null);
    setNewName("");

    try {
      const response = await fetch(`${backendURL}/api/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldName, newName }),
      });

      const data = await response.json();
      showNotification(data.message);

      // Refresh thumbnails by re-fetching the photos from the backend
      const updatedPhotoListResponse = await fetch(`${backendURL}/api/photos`);
      const updatedPhotoList = await updatedPhotoListResponse.json();
      setPhotos(updatedPhotoList.photos);
    } catch (err) {
      console.error("Error renaming file:", err);
      showNotification("שגיאה בשינוי שם הקובץ");
    }
  };

  const handleConfirm = async () => {
    const userConfirmed = window.confirm("האם אתה בטוח שברצונך לשלוח?");
    if (!userConfirmed) return;

    try {
      const response = await fetch(`${backendURL}/api/confirm`, {
        method: "POST",
      });
      const data = await response.json();
      showNotification(data.message);
      setPhotos([]);
      localStorage.removeItem("photos");
      setMessage("");
    } catch (err) {
      console.error("שגיאה בשליחה:", err);
      showNotification("שגיאה בשליחה");
    }
  };

  const handleDelete = async () => {
    const userConfirmed = window.confirm("האם אתה בטוח שברצונך למחוק הכל?");
    if (!userConfirmed) return;

    try {
      const response = await fetch(`${backendURL}/api/delete`, {
        method: "DELETE",
      });
      const data = await response.json();
      showNotification(data.message);
      setPhotos([]);
      localStorage.removeItem("photos");
      setMessage("");
    } catch (err) {
      console.error("שגיאה במחיקת קבצים:", err);
      showNotification("שגיאה במחיקת קבצים");
    }
  };

  const handleDeletePhoto = async (photoName) => {
    const userConfirmed = window.confirm(
      `האם אתה בטוח שברצונך למחוק את ${photoName}?`
    );
    if (!userConfirmed) return;

    try {
      const response = await fetch(`${backendURL}/api/photo`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photoName }),
      });

      const data = await response.json();
      showNotification(data.message);

      setPhotos((prevPhotos) =>
        prevPhotos.filter((photo) => photo !== photoName)
      );
    } catch (err) {
      console.error("שגיאה במחיקת תמונה:", err);
      showNotification("שגיאה במחיקת תמונה");
    }
  };

  const handlePrint = () => {
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

    const mediaQueryList = newWindow.matchMedia("print");

    mediaQueryList.addEventListener("change", (e) => {
      if (!e.matches) {
        // Print dialog has closed
        newWindow.close();
      }
    });

    newWindow.print();
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
        <div className="actions">
          <button onClick={handleDelete}>🗑️ מחק הכל</button>
          <button onClick={handlePrint}>🖨️ הדפס</button>
        </div>
        <div className="info">
        <h1>סריקות📄</h1>
        <p><b>{photos.length}</b></p>
        </div>
      </div>

      {notification && (
        <div className="notification">
          <p>{notification}</p>
        </div>
      )}

      <div className="photo-list">
        {photos.map((photo, index) => (
          <div key={index} className="photo-card">
            <img
              src={searchIcon}
              alt="icon"
              className="photo-icon"
              onClick={() => handlePhotoClick(photo)}
            />
            {editingIndex === index ? (
              <div className="photo-edit">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="photo-input"
                />
                <button
                  className="save-button"
                  onClick={() => handleSave(index)}
                >
                  שמור
                </button>
              </div>
            ) : (
              <div className="photo-details">
                <p className="photo-name">{photo}</p>
                <div className="photo-actions">
                  <button
                    className="delete-photo-button"
                    onClick={() => handleDeletePhoto(photo)}
                  >
                    מחק
                  </button>
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(index)}
                  >
                    ערוך
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedPhoto && (
        <div className="photo-viewer" onClick={closePhotoViewer}>
          <div className="photo-viewer-content">
            <img
              src={`${backendURL}/${selectedPhoto}`}
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
