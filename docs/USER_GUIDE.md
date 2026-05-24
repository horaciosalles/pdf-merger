# PDF Toolkit - User Guide

## Overview

PDF Toolkit is a powerful, privacy-first PDF editor that runs entirely in your web browser. All processing happens locally on your computer—no data is ever sent to any server.

## Features

### 🔗 Merge
Combine multiple PDF files into one document. Drag and drop to reorder files before merging.

**How to merge:**
1. Click the "Merge" tab
2. Drag PDF files into the drop zone or click to select
3. Reorder files by dragging them up or down
4. Click "Merge PDFs"
5. The merged PDF will automatically download

### ✂️ Split
Extract specific pages or divide a PDF into multiple files.

**Split by page range:**
1. Click the "Split" tab
2. Select a PDF
3. Enter the page numbers you want (e.g., `1-5,7,10-15`)
4. Click "Extract Range"

**Split into individual pages:**
1. Select a PDF
2. Click "Split Into Pages"
3. Each page will download as a separate PDF

**Split by page count:**
1. Enter how many pages per file (e.g., 10)
2. Click "Split by Count"
3. Multiple PDFs will download

### 🔒 Encrypt
Protect your PDF with a password. Anyone who opens the PDF will need to enter the correct password.

**How to encrypt:**
1. Click the "Encrypt" tab
2. Select a PDF
3. Click "Set Password & Encrypt"
4. Enter your desired password
5. The encrypted PDF will download

### 🔓 Decrypt
Remove password protection from an encrypted PDF (you must know the correct password).

**How to decrypt:**
1. Click the "Decrypt" tab
2. Select an encrypted PDF
3. Click "Enter Password & Decrypt"
4. Enter the correct password
5. The unprotected PDF will download

### 🛠️ Tools
Advanced PDF editing features.

#### Delete Pages
Remove unwanted pages from your PDF.
- Enter page numbers to delete (e.g., `1-3,5`)
- The new PDF downloads without those pages

#### Rotate Pages
Rotate all pages in your PDF.
- Choose rotation angle (90°, 180°, or 270°)
- Click "Rotate All Pages"

#### Add Watermark
Add semi-transparent text to all pages (e.g., "DRAFT", "CONFIDENTIAL").
- Enter the watermark text
- The watermarked PDF will download

#### Add Page Numbers
Automatically number all pages at the bottom-right corner.
- Click "Add Page Numbers"
- Format: "1/10", "2/10", etc.

#### View & Remove Metadata
See and remove hidden information in PDFs.
- Click "View & Manage Metadata"
- See title, author, keywords, creation date
- Click "Remove Metadata" for privacy

## Privacy & Security

### 100% Local Processing
- ✅ All operations happen in your browser
- ✅ No data is uploaded to any server
- ✅ No internet connection required (after initial load)
- ✅ No accounts, logins, or tracking

### Password Protection
- Passwords are never sent to any server
- Encrypted PDFs use AES-256 encryption
- Passwords are only used locally in your browser

### Data Safety
- Your files are never stored on our servers
- Browser memory is cleared after each session
- No cookies or tracking
- No logs of your activity

## Tips & Tricks

### File Management
- Drag files into the drop zone or click to browse
- Remove files individually with the × button
- Drag to reorder files in merge operations

### Page Ranges
When entering page numbers:
- Single page: `5`
- Range: `1-10`
- Multiple ranges: `1-5,10-15,20`
- Mixed: `1,3-5,10`

### Large Files
- Browser memory limit: typically 500MB-2GB
- Very large files may take longer to process
- Use "Split" to work with large PDFs in chunks

### Keyboard Shortcuts
- `Ctrl+A` to select all files in the current tab

## System Requirements

### Browsers Supported
- Chrome/Edge 61+
- Firefox 55+
- Safari 11+
- Opera 48+

### Hardware
- Modern computer or tablet with at least 2GB RAM
- Sufficient disk space for downloads (varies by file size)

### Internet
- Required to load PDF Toolkit initially
- Not required for processing (works offline)

## Troubleshooting

### "PDF won't load"
- Ensure the file is a valid PDF
- File should be smaller than 500MB
- Try with a different PDF to verify

### "Password doesn't work"
- Passwords are case-sensitive
- Check for leading/trailing spaces
- Make sure you're using the correct password
- Some PDFs may use different encryption methods

### "Merge isn't working"
- Select at least 2 PDFs
- Check browser console (F12) for errors
- Try with smaller PDFs first

### "Very slow processing"
- Large files take longer to process
- Browser memory limit may be reached
- Try splitting the PDF first
- Use Chrome/Edge for best performance

### "Service Worker issues"
- Requires HTTPS in production
- Clear browser cache and try again
- Check browser privacy settings

## Offline Use

After initial load, PDF Toolkit works completely offline:
1. Open it once with internet connection
2. Browser downloads and caches all files
3. Use it anytime without internet
4. All your processing stays local

## Performance Tips

1. **For large files:** Split them first, then process
2. **For batch operations:** Process files in smaller groups
3. **For complex operations:** Refresh browser if it slows down
4. **For maximum speed:** Use Chrome or Edge browsers

## FAQ

**Q: Is my data safe?**
A: Yes! Everything is processed locally in your browser. Nothing is uploaded.

**Q: Can I use this offline?**
A: Yes! After the initial load, the app works completely offline.

**Q: What's the file size limit?**
A: Typically 500MB-2GB, depending on your computer's RAM.

**Q: Can I undo operations?**
A: No. Always keep a backup of your original PDFs before processing.

**Q: Does it work on mobile?**
A: Yes! PDF Toolkit is fully responsive and works on phones and tablets.

**Q: How do I save my settings?**
A: Settings are saved in your browser's local storage automatically.

**Q: Can I share this with others?**
A: Yes! Share the link: https://horaciosalles.github.io/pdf-merger/

**Q: Is there a desktop version?**
A: No, but the web version works great on all computers and tablets.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+A` / `Cmd+A` | Select all files |
| `Enter` | Confirm password in dialogs |
| `Esc` | Close modals |

## Getting Help

- Check the [Architecture Documentation](./ARCHITECTURE.md) for technical details
- Visit [GitHub Issues](https://github.com/horaciosalles/pdf-merger/issues) to report bugs
- Check browser console (F12) for error messages

## License

PDF Toolkit is open-source and free to use under the MIT License.

---

**Powered by:** [PDF-LIB](https://pdf-lib.js.org/) and [SortableJS](https://sortablejs.github.io/Sortable/)
