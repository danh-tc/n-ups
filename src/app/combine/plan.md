# 📘 PDF Uploader – Flow Summary (v2)

## 🧭 Overview
Client-side application for uploading, sorting, and managing multiple PDF files.
All operations are done in-browser using **IndexedDB** — no backend required.

---

## ⚙️ Core Features
- Multiple PDF upload (supports batch upload)
- Preserve order of selection
- Progress tracking (via FileReader)
- Sort by name (ASC/DESC)
- Manual reordering (drag & drop)
- Delete individual files (❌)
- Store files + metadata in IndexedDB
- Restore files and order after reload
- **Combine PDFs (future)** → merge in order → download → clear data

---

## 🧱 Data Model

Each file record stored in IndexedDB (`pdfUploaderDB` / `pdfFiles` store):

```js
{
  id: string,
  name: string,
  size: number,
  file: Blob,
  uploadedAt: string,
  order: number
}

src/
 ├─ components/
 │   ├─ UploadArea.jsx
 │   ├─ FileList.jsx
 │   ├─ FileItem.jsx
 │   ├─ SortControls.jsx
 │   ├─ ActionBar.jsx
 │   ├─ ProgressBar.jsx
 │   ├─ EmptyState.jsx
 │   └─ CombineButton.jsx   (future)
 │
 ├─ hooks/
 │   ├─ usePdfStore.js
 │   └─ useIndexedDb.js
 │
 ├─ lib/
 │   ├─ db.js               (idb wrapper)
 │   └─ pdfUtils.js         (future: combine / merge logic)
 │
 ├─ pages/
 │   └─ App.jsx             (main entry, orchestrates components)
 │
 └─ styles/
     └─ uploader.css / uploader.scss

# 🧭 Implementation Order – PDF Uploader (Client-Side)

## 🪜 Phase 1 – Core Infrastructure (Day 1–2)
| Step | File / Component | Description |
|------|------------------|--------------|
| 1️⃣ | **`lib/db.js`** | Implement IndexedDB connection using `idb` library. Create store `pdfFiles` with keyPath `id`. |
| 2️⃣ | **`useIndexedDb.js`** | Wrap database operations (`getAllFiles`, `saveFile`, `deleteFile`, `clearFiles`) as async hooks. |
| 3️⃣ | **`usePdfStore.js`** | Create React state (Zustand or useState-based) to manage file list in memory and sync with DB. |

---

## 🪜 Phase 2 – Upload & Display (Day 2–4)
| Step | File / Component | Description |
|------|------------------|--------------|
| 4️⃣ | **`UploadArea.jsx`** | Add multiple-file upload input (`accept="application/pdf" multiple`) and drag-drop support. |
| 5️⃣ | **`App.jsx`** | Initialize DB, load saved files, render layout with UploadArea + FileList. |
| 6️⃣ | **`FileList.jsx`** | Render list of uploaded PDFs; connect SortableJS for drag-drop. |
| 7️⃣ | **`FileItem.jsx`** | Show file name, size, progress, and ❌ delete button. |
| 8️⃣ | **`ProgressBar.jsx`** | Add visual upload progress indicator (simple `<progress>` or styled bar). |

---

## 🪜 Phase 3 – Sorting & Actions (Day 4–5)
| Step | File / Component | Description |
|------|------------------|--------------|
| 9️⃣ | **`SortControls.jsx`** | Implement “Sort by Name (ASC/DESC)” functionality. Update `order` fields and DB. |
| 🔟 | **`ActionBar.jsx`** | Add toolbar with “Sort”, “Clear All”, and placeholder “Combine” button. |
| 11️⃣ | **`EmptyState.jsx`** | Display friendly message when no PDFs uploaded. |

---

## 🪜 Phase 4 – Persistence & State Sync (Day 5–6)
| Step | File / Component | Description |
|------|------------------|--------------|
| 12️⃣ | Integrate DB Sync | Ensure upload, reorder, and delete actions automatically update IndexedDB. |
| 13️⃣ | On App Load | Retrieve and render saved files from IndexedDB (sorted by `order`). |
| 14️⃣ | Handle Refresh | Verify that UI restores last state after browser reload. |

---

## 🪜 Phase 5 – Combine & Cleanup (Future)
| Step | File / Component | Description |
|------|------------------|--------------|
| 15️⃣ | **`CombineButton.jsx`** | Use `pdf-lib` to merge files in current order. Generate downloadable merged PDF. |
| 16️⃣ | After Combine | Automatically call `clearFiles()` to delete all records from IndexedDB and reset UI. |
| 17️⃣ | Optional Cleanup | Auto-delete files older than X days during app load. |

---

## 🧩 Future Enhancements
| Feature | Description |
|----------|--------------|
| 🖼️ `PdfPreviewModal.jsx` | Show preview thumbnails using `pdf.js`. |
| 🧾 `ConfirmDialog.jsx` | Confirm “Clear All” or “Combine” actions. |
| 🔔 `ToastNotification.jsx` | Show success/error messages. |
| ⚙️ `SettingsPanel.jsx` | Manage cleanup policy, sorting defaults, size limits, etc. |

---

## ✅ Summary
**Build Order:**
