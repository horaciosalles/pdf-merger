# PDF Toolkit - Architecture Guide

## Project Structure

```
pdf-toolkit/
├── index.html                 # Main entry point (tab-based UI)
├── manifest.json              # PWA configuration
├── README.md                  # User documentation
├── src/
│   ├── css/
│   │   ├── main.css          # Global styles and components
│   │   └── responsive.css    # Mobile and responsive design
│   ├── js/
│   │   ├── config.js         # Application configuration
│   │   ├── app.js            # Main application controller
│   │   ├── modules/
│   │   │   ├── fileHandler.js     # File I/O operations
│   │   │   ├── pdfHelper.js       # PDF utility functions
│   │   │   ├── merger.js          # Merge functionality
│   │   │   ├── splitter.js        # Split functionality
│   │   │   ├── encryptor.js       # Encrypt/Decrypt functionality
│   │   │   ├── processor.js       # Advanced operations (rotate, watermark, etc.)
│   │   │   └── ui.js              # UI state management
│   │   └── workers/
│   │       └── pdfWorker.js       # Web Worker for heavy operations
│   ├── lib/
│   │   ├── pdf-lib.min.js         # PDF manipulation library
│   │   └── Sortable.min.js        # Drag-drop library
│   ├── assets/
│   │   └── (icons, images)
│   └── sw.js                  # Service Worker for offline support
└── docs/
    ├── ARCHITECTURE.md        # This file
    ├── DEVELOPMENT.md         # Development guide
    └── USER_GUIDE.md          # User documentation
```

## Module Architecture

### Core Modules

#### `config.js`
- Centralized configuration management
- Feature flags
- Storage keys
- Compression presets
- Encryption settings

#### `fileHandler.js`
- File validation (PDF check, size limits)
- File I/O operations (read, download)
- File size formatting
- Memory management

#### `pdfHelper.js`
- Wrapper around pdf-lib.js
- Common PDF operations (load, save, extract pages)
- Metadata management
- Encryption/decryption helpers
- Page parsing and manipulation

### Feature Modules

#### `merger.js` - PDF Merging
- `mergePDFs()` - Combine multiple PDFs
- `mergeWithOrdering()` - Merge with custom page ranges

#### `splitter.js` - PDF Splitting
- `splitByRange()` - Extract specific pages
- `splitIntoPages()` - Split into individual page PDFs
- `splitByCount()` - Split into chunks by page count
- `getPageCount()` - Get number of pages

#### `encryptor.js` - PDF Encryption
- `encryptPDF()` - Add password protection
- `decryptPDF()` - Remove password protection
- `isPDFEncrypted()` - Check encryption status
- `createRestrictedCopy()` - Create with specific permissions
- `verifyPassword()` - Validate password

#### `processor.js` - Advanced Operations
- `rotatePages()` - Rotate pages by degrees
- `deletePages()` - Remove pages
- `extractPages()` - Non-destructive extraction
- `getMetadata()` - Read PDF metadata
- `setMetadata()` - Write PDF metadata
- `removeMetadata()` - Privacy: strip all metadata
- `compressPDF()` - Reduce file size
- `addWatermark()` - Add text watermark
- `addPageNumbers()` - Add page numbering
- `duplicatePages()` - Duplicate specific pages

### UI Module

#### `ui.js` - User Interface Management
- Tab switching
- File list management
- Modal dialogs
- Toast notifications
- Progress indicators
- Password input prompts
- Local storage (preferences, recent files)

### Main Application

#### `app.js` - Application Controller
- Orchestrates all modules
- Event handling
- Dropzone setup
- Operation handlers for each tab
- Error handling and user feedback
- Worker integration (future)

### Service Worker

#### `sw.js` - Offline Support
- Asset caching strategy
- Network-first fallback
- Cache management
- Update handling

### Web Worker

#### `pdfWorker.js` - Background Processing
- Heavy PDF operations run off main thread
- Progress reporting
- Prevents UI blocking on large files

## Data Flow

### Merge Operation
```
User Uploads PDFs
    ↓
fileHandler.validateFiles()
    ↓
UI displays file list
    ↓
User clicks "Merge"
    ↓
PDFMerger.mergePDFs()
    ├─ For each file:
    │   ├─ fileHandler.readAsArrayBuffer()
    │   ├─ PDFHelper.loadPDF()
    │   └─ PDFDocument.copyPages()
    └─ PDFHelper.savePDF()
    ↓
fileHandler.downloadPDF()
```

### Encryption Operation
```
User Uploads PDF
    ↓
User Sets Password
    ↓
PDFEncryptor.encryptPDF()
    ├─ fileHandler.readAsArrayBuffer()
    ├─ PDFHelper.loadPDF()
    ├─ PDFHelper.encryptPDF() with password
    └─ PDFHelper.savePDF()
    ↓
fileHandler.downloadPDF()
```

## Security Architecture

### Local-Only Processing
- ✅ All PDF operations happen in browser memory
- ✅ No network requests for processing
- ✅ No temporary files on disk
- ✅ No data transmission

### Encryption Implementation
- Uses pdf-lib's AES-256 encryption
- User password is never stored or transmitted
- Passwords are only used for encryption/decryption
- Session passwords are cleared after use

### Privacy Features
- Metadata removal option
- Auto-cache clearing possible
- No analytics or telemetry
- No cookies or tracking

## Browser APIs Used

### Required
- File API (File, FileReader, Blob)
- Fetch API
- LocalStorage API
- Promise/async-await

### Optional
- Service Worker API (offline support)
- Web Worker API (background processing)
- Web Share API (future enhancement)

## Performance Considerations

### Large Files
- Files up to 500MB+ supported (limited by available RAM)
- Web Workers prevent UI blocking
- Progress callbacks for user feedback
- Chunked processing where possible

### Optimization Strategies
- Lazy loading of modules (can be added)
- Caching of parsed PDFs (in progress)
- Service Worker caching
- Library minification

## Extension Points

### Adding New Operations
1. Create new module in `src/js/modules/`
2. Import and expose in `app.js`
3. Add UI controls in `index.html`
4. Wire event handlers in `app.js`

### Adding UI Components
- Use existing `UIManager` methods
- Follow CSS component patterns in `main.css`
- Maintain responsive design with `responsive.css`

### Plugin Architecture (Future)
- Operations could be plugins loaded dynamically
- Feature flags for enabling/disabling features
- Custom themes via CSS variables

## Testing Strategy

### Unit Tests (Future)
- Test each module independently
- Mock file I/O
- Test edge cases (empty PDFs, corrupted files, etc.)

### Integration Tests
- Test multi-step workflows
- Test error handling
- Test with various PDF types

### Manual Testing
- Different PDF sizes and formats
- Various browsers
- Mobile devices
- Offline mode

## Build & Deployment

### Development
- Serve files locally with live reload
- Source maps for debugging
- Module resolution via ES6 imports

### Production
- Minify CSS and JS (optional)
- Gzip compression
- CDN caching
- HTTPS required for Service Worker

### Deployment Checklist
- ✅ All modules working
- ✅ Service Worker functional
- ✅ PWA manifest valid
- ✅ HTTPS enabled
- ✅ Browser compatibility tested
- ✅ Offline functionality verified

## Browser Support

### Required Features
- ES6 modules
- async/await
- Fetch API
- File API

### Supported Browsers
- Chrome/Edge 61+
- Firefox 55+
- Safari 11+
- Opera 48+

### Progressive Enhancement
- Works in older browsers with polyfills
- Service Worker graceful fallback
- Web Worker optional

## Future Enhancements

### Phase 2 Planned
- [ ] Advanced compression algorithms
- [ ] Image-to-PDF conversion
- [ ] Batch processing UI
- [ ] Dark mode theme
- [ ] More encryption algorithms

### Phase 3 Planned
- [ ] Cloud sync (optional, encrypted)
- [ ] Custom signatures
- [ ] Form filling
- [ ] Annotation tools
- [ ] PDF to image conversion

### Performance Improvements
- [ ] Streaming for large files
- [ ] Worker thread pool
- [ ] Virtual scrolling for large file lists
- [ ] Incremental caching

### UX Improvements
- [ ] Drag-reorder file lists
- [ ] Preview thumbnails
- [ ] Undo/redo
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

## Troubleshooting

### Common Issues
1. **"Libraries not loaded"** - Ensure pdf-lib.min.js and Sortable.min.js are in src/lib/
2. **"Service Worker fails"** - Requires HTTPS in production
3. **"Large file timeout"** - Use Web Worker or split processing
4. **"Password incorrect"** - Password is case-sensitive and must match exactly

## License
MIT - Free for personal and commercial use
