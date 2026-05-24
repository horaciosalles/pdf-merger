# PDF Toolkit 📄

A powerful, privacy-first PDF editor that runs entirely in your browser. Merge, split, encrypt, and edit PDFs locally with **zero data transmission**.

**🔗 Live Demo:** [https://horaciosalles.github.io/pdf-merger/](https://horaciosalles.github.io/pdf-merger/)

## ✨ Features

### Core Operations (Phase 1) ✅
- **🔗 Merge** - Combine multiple PDFs into one with drag-and-drop reordering
- **✂️ Split** - Extract page ranges or divide PDFs into individual pages
- **🔒 Encrypt** - Protect PDFs with password (AES-256 encryption)
- **🔓 Decrypt** - Remove password protection from encrypted PDFs

### Advanced Tools (Phase 2) ✅
- **🗑️ Delete Pages** - Remove unwanted pages
- **🔄 Rotate Pages** - Rotate 90°, 180°, or 270°
- **💧 Watermark** - Add text watermarks to all pages
- **📄 Page Numbers** - Auto-number all pages
- **📋 Metadata Management** - View and remove PDF metadata

### Progressive Web App (Phase 3) ✅
- 📱 Fully responsive (mobile, tablet, desktop)
- 🌐 Works completely offline (after initial load)
- ⚙️ Installable as app (Add to Home Screen)
- ⚡ Service Worker caching for instant load

### Additional Features (Phase 4)
- 🔄 Batch processing (future)
- 🖼️ Image to PDF conversion (future)
- 📝 Page annotations (future)

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
3. Choose operation
4. Results download automatically

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
│   │   ├── modules/       # Feature modules
│   │   └── workers/       # Web Workers
│   ├── lib/               # Third-party libraries
│   └── sw.js              # Service Worker
├── docs/                  # Documentation
└── README.md
```

## 🔧 Technology Stack

- **[PDF-LIB](https://pdf-lib.js.org/)** - PDF manipulation (AES-256 encryption, merging, splitting)
- **[SortableJS](https://sortablejs.github.io/Sortable/)** - Drag-and-drop file reordering
- **Service Workers** - Offline functionality
- **Web Workers** - Background processing
- **Vanilla JavaScript** - No heavy frameworks (fast & lightweight)

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
