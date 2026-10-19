# PDF Toolkit 📄

A powerful, privacy-first PDF editor that runs entirely in your browser. Merge, split, encrypt, and edit PDFs locally with **zero data transmission**.

**🔗 Live Demo:** [https://horaciosalles.github.io/pdf-merger/](https://horaciosalles.github.io/pdf-merger/)

## ✨ Features

### Workspace
- **One document panel for every tool.** Drop PDFs or JPG/PNG images anywhere on the page, click to browse, paste, or drop whole folders
- **Chain edits** (watermark → page numbers → …) on the active document, with **Undo**, then download when ready
- Encryption is detected on import: permissions-only PDFs are unlocked automatically; password-protected ones show a 🔒 badge with one-click unlock

### Tools
- **🔗 Merge** — all documents in list order (drag the numbered handle to reorder)
- **✂️ Split** — single pages, page ranges (`1-3,7,10-end`), or every N pages; multi-file output arrives as one ZIP
- **🔒 Encrypt** — AES-256 with password confirmation and print/copy/edit/annotate permissions
- **🔓 Unlock** — remove restrictions (no password needed), remove a known password, or try a list of candidate passwords
- **🧩 Visual page editor** — thumbnails; drag to reorder, rotate, delete, duplicate, or extract selected pages
- **Other tools:** delete/rotate pages, watermark (with opacity), page numbers (position, format, skip first page), metadata view/edit/strip (including XMP), reverse order, insert a blank page, flatten forms, structural optimization, and export pages as PNG (ZIP)

### Progressive Web App
- Responsive, light/dark themes, keyboard accessible
- Works from `file://` with no server, or served with offline support via the service worker

## 🔒 Privacy & Security

**100% Local Processing**
- ✅ All operations happen in your browser
- ✅ No data uploaded to any server
- ✅ No accounts, logins, or tracking
- ✅ Works offline
- ✅ Open source

**Encryption**
- Uses AES-256 encryption (industry standard)
- Passwords never transmitted
- All processing local to browser memory

## 🚀 Getting Started

### Use Online (No Installation)
1. Visit [https://horaciosalles.github.io/pdf-merger/](https://horaciosalles.github.io/pdf-merger/)
2. Select your PDFs
3. Choose a tool. Edits apply to the active document; download it (or Undo) at any time

### Run Locally
```bash
# Clone repository
git clone https://github.com/horaciosalles/pdf-merger.git
cd pdf-merger

# Start local server (choose one)
python -m http.server 8000      # Python
npx http-server                 # Node.js
php -S localhost:8000           # PHP

# Open browser
# Navigate to http://localhost:8000
```

## 📋 Requirements

### Browser Support
- Chrome/Edge 61+
- Firefox 55+
- Safari 11+
- Opera 48+

### Hardware
- 2GB+ RAM
- Modern processor
- Works on desktop, tablet, and mobile

## 📚 Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - How to use each feature
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Technical architecture
- **[Development Guide](./docs/DEVELOPMENT.md)** - How to contribute

## 🏗️ Project Structure

```
pdf-toolkit/
├── index.html              # Main app (tab-based UI)
├── manifest.json           # PWA configuration
├── src/
│   ├── css/               # Stylesheets
│   ├── js/
│   │   ├── app.js         # Main application
│   │   ├── config.js      # Configuration
│   │   └── modules/       # Engine (pdfHelper, merger, splitter, encryptor,
│   │                      #   processor), workspace, render, pageEditor, ui
│   └── lib/               # Vendored third-party libraries
├── sw.js                  # Service Worker (root, so its scope covers the app)
├── tests/                 # Jest unit/engine tests, Playwright E2E, fixtures
├── docs/                  # Documentation
└── README.md
```

## 🔧 Technology Stack

- **[@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib)** - pdf-lib fork with working encryption/decryption (RC4 and AES-128/256)
- **[pdf.js](https://mozilla.github.io/pdf.js/)** - Page thumbnails, the page editor, and PNG export
- **[SortableJS](https://sortablejs.github.io/Sortable/)** - Drag-and-drop reordering
- **[fflate](https://github.com/101arrowz/fflate)** - ZIP packaging for multi-file output
- **Vanilla JavaScript** - Plain scripts with no bundler, so it runs from `file://`

## 💻 Development

### Quick Start
```bash
npm install        # Install dev dependencies
npm run dev       # Start local server with live reload
npm run build     # Build for production
npm run test      # Run tests
```

### Adding Features
1. Create module in `src/js/modules/`
2. Add UI in `index.html`
3. Wire handler in `src/js/app.js`
4. Update documentation

See [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for detailed guide.

## 🐛 Troubleshooting

### "PDF won't load"
- File must be a valid PDF
- File size under 500MB
- Check browser console (F12)

### "Password doesn't work"
- Passwords are case-sensitive
- Check for spaces
- Must be the correct password

### "Very slow on large files"
- Browser memory limited (~1-2GB)
- Try splitting PDF first
- Use Chrome/Edge for best performance

### "Service Worker issues"
- Requires HTTPS in production
- Works with localhost in development
- Clear cache: Ctrl+Shift+Delete

## 📊 Performance

- **Initial Load:** ~2 seconds (cached after)
- **Merge 10 PDFs:** ~5-10 seconds
- **Split 100-page PDF:** ~3-5 seconds
- **Encrypt PDF:** ~1-2 seconds

## 📋 File Size Limits

- Single file: Up to 500MB
- Total operation: Limited by available RAM (typically 1-2GB)
- Workaround: Use split feature first

## 🔐 Security Notes

1. **Password Protection:** Use strong passwords (12+ chars recommended)
2. **Metadata:** Remove metadata before sharing for privacy
3. **Backups:** Always keep original PDFs backed up
4. **Browser:** Keep browser updated for security patches

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with meaningful messages (`git commit -m 'feat: add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 License

MIT License - Free for personal and commercial use. See LICENSE file for details.

## 🙏 Credits

- **PDF-LIB** - Amazing PDF manipulation library
- **SortableJS** - Drag-and-drop functionality
- Built with ❤️ for privacy-conscious users

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/horaciosalles/pdf-merger/issues)
- **Questions:** Check [User Guide](./docs/USER_GUIDE.md)
- **Development:** See [Development Guide](./docs/DEVELOPMENT.md)

## 🗺️ Roadmap

### Phase 1 ✅ Complete
- Core merge, split, encrypt, decrypt
- Basic page tools
- PWA support

### Phase 2 ✅ Complete
- Advanced page management
- Watermarking and page numbers
- Metadata tools
- Web Worker integration

### Phase 3 ✅ Complete
- Service Worker caching
- Responsive design
- Performance optimization

### Phase 4 🚀 In Progress
- Batch processing
- Advanced compression
- Image to PDF conversion
- Form filling

### Phase 5 🔮 Planned
- Cloud sync (optional, encrypted)
- Annotations and drawings
- Signature support
- Improved compression

## ⭐ Star History

If you find this useful, please give it a ⭐ on GitHub!

---

**Made with ❤️ by Horácio Salles**

🔗 [GitHub](https://github.com/horaciosalles) | 🐦 [Twitter](https://twitter.com/horaciosalles) | 💼 [LinkedIn](https://linkedin.com/in/horaciosalles) 
