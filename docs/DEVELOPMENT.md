# PDF Toolkit - Development Guide

## Getting Started

### Prerequisites
- Node.js (optional, for local development server)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Git for version control

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/horaciosalles/pdf-merger.git
   cd pdf-merger
   ```

2. **Install dependencies (optional)**
   ```bash
   npm install
   ```

3. **Start a local server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

4. **Open in browser**
   ```
   http://localhost:8000
   ```

## Project Structure Review

```
src/
├── css/
│   ├── main.css         # Global styles
│   └── responsive.css   # Mobile responsiveness
├── js/
│   ├── config.js        # Configuration
│   ├── app.js           # Main application
│   ├── modules/         # Feature modules
│   └── workers/         # Web Workers
├── lib/                 # Third-party libraries
└── assets/              # Icons and images
```

## Adding New Features

### Adding a New PDF Operation

1. **Create a new module** in `src/js/modules/`:

```javascript
// src/js/modules/myOperation.js
import PDFHelper from './pdfHelper.js';
import FileHandler from './fileHandler.js';

class MyOperation {
  static async doSomething(file, options = {}) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      
      // Do your operation here
      
      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

export default MyOperation;
```

2. **Import in app.js**:
```javascript
import MyOperation from './modules/myOperation.js';
```

3. **Add UI controls** in `index.html`:
```html
<button id="my-operation-btn" class="btn btn-primary">
  Do Something
</button>
```

4. **Wire the handler** in `app.js`:
```javascript
const myBtn = document.getElementById('my-operation-btn');
if (myBtn) {
  myBtn.addEventListener('click', () => this.performMyOperation());
}
```

5. **Implement the handler**:
```javascript
async performMyOperation() {
  if (this.currentFiles.length === 0) {
    this.ui.showToast('Select a PDF', 'warning');
    return;
  }

  this.ui.setProcessing(true);
  const progress = this.ui.showProgress('Processing...');

  try {
    const result = await MyOperation.doSomething(this.currentFiles[0]);
    FileHandler.downloadPDF(result, `result_${this.currentFiles[0].name}`);
    this.ui.showToast('Operation successful!', 'success');
  } catch (error) {
    this.ui.showToast('Operation failed: ' + error.message, 'error');
  } finally {
    progress.close();
    this.ui.setProcessing(false);
  }
}
```

### Adding UI Styles

**Global styles** go in `src/css/main.css`:
```css
.my-component {
  padding: 20px;
  background: white;
  border-radius: 4px;
}
```

**Responsive adjustments** in `src/css/responsive.css`:
```css
@media (max-width: 768px) {
  .my-component {
    padding: 15px;
  }
}
```

## Code Style Guide

### JavaScript
- Use ES6+ features (const, arrow functions, async/await)
- Use meaningful variable names
- Add JSDoc comments for functions:

```javascript
/**
 * Merges multiple PDFs
 * @param {File[]} files - Array of PDF files
 * @param {Object} options - Operation options
 * @returns {Promise<Uint8Array>} Merged PDF bytes
 */
static async mergePDFs(files, options = {}) {
  // Implementation
}
```

### CSS
- Use CSS variables defined in `:root`
- Mobile-first responsive design
- Meaningful class names
- Keep specificity low

### HTML
- Semantic HTML5
- ARIA labels for accessibility
- Data attributes for JS references

## Testing

### Manual Testing Checklist

- [ ] Merge 2+ PDFs
- [ ] Split PDF by range
- [ ] Split PDF into pages
- [ ] Encrypt with password
- [ ] Decrypt with password
- [ ] Delete pages
- [ ] Rotate pages
- [ ] Add watermark
- [ ] Add page numbers
- [ ] View metadata
- [ ] Remove metadata

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Edge Cases
- [ ] Empty PDF
- [ ] Single page PDF
- [ ] Large file (100MB+)
- [ ] Encrypted PDF
- [ ] PDF with special characters in name
- [ ] Corrupted PDF

## Debugging

### Browser DevTools

1. **Open DevTools**: `F12` or `Ctrl+Shift+I`
2. **Console tab**: Check for errors
3. **Network tab**: Monitor requests (should all be local)
4. **Application tab**: View Service Worker and local storage
5. **Sources tab**: Debug JavaScript

### Common Debugging Points

```javascript
// Check if libraries loaded
console.log(window.PDFLib, window.Sortable);

// Test a module
import PDFHelper from './modules/pdfHelper.js';
console.log(PDFHelper);

// Check app state
console.log(window.pdfToolkit.currentFiles);
```

### Console Logging

Add logging for troubleshooting:
```javascript
console.log('PDFMerger: Starting merge with', files.length, 'files');

console.warn('PDFMerger: Potential issue detected');

console.error('PDFMerger: Critical error', error);
```

## Performance Optimization

### Metrics to Monitor
- Initial load time (target: < 2s)
- Operation processing time
- Memory usage
- File size

### Optimization Techniques
1. **Lazy load modules** (import only when needed)
2. **Use Web Workers** for heavy operations
3. **Cache parsed PDFs** when possible
4. **Minify assets** for production
5. **Use compression** for downloads

### Profiling

```javascript
// Measure operation time
const start = performance.now();
const result = await PDFMerger.mergePDFs(files);
const time = performance.now() - start;
console.log(`Merge took ${time.toFixed(2)}ms`);
```

## Accessibility

### WCAG 2.1 Compliance

- [ ] Keyboard navigation works
- [ ] Screen readers supported
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] Labels on all inputs
- [ ] Alt text on images

### Testing Tools
- [WAVE](https://wave.webaim.org/) - Accessibility checker
- [Axe DevTools](https://www.deque.com/axe/devtools/) - Automated testing
- Screen readers: NVDA, JAWS, VoiceOver

## Deployment

### Development Build
```bash
# No minification, source maps for debugging
npm run dev
```

### Production Build
```bash
# Minify CSS and JS
npm run build
```

### Deployment Steps

1. **Test locally**
   ```bash
   npm run test
   ```

2. **Build for production**
   ```bash
   npm run build
   ```

3. **Verify Service Worker**
   - HTTPS required
   - Manifest.json accessible
   - All assets cached

4. **Deploy to GitHub Pages**
   ```bash
   git add .
   git commit -m "Release v1.0"
   git push origin main
   ```

5. **Verify deployment**
   - Check https://horaciosalles.github.io/pdf-merger/
   - Test all features
   - Check offline functionality

## Git Workflow

### Branching
```bash
# Create feature branch
git checkout -b feature/new-feature

# Commit changes
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create Pull Request on GitHub
```

### Commit Messages
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `test:` Tests

## Troubleshooting Development Issues

### Module Import Errors
- Check file paths are correct
- Ensure `export default` in module
- Verify import statements match exports

### Style Not Applied
- Check CSS file is linked in HTML
- Verify class names match
- Clear browser cache (Ctrl+Shift+Delete)

### Service Worker Issues
- Requires HTTPS (use localhost for dev)
- Check in DevTools > Application > Service Workers
- Clear storage if stuck

### Large File Issues
- Browser memory limited
- Test with smaller files first
- Use Web Worker for processing

## Resources

### Documentation
- [PDF-LIB Docs](https://pdf-lib.js.org/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Service Worker Guide](https://developers.google.com/web/tools/workbox)

### Tools
- [VS Code](https://code.visualstudio.com/) - Editor
- [Git](https://git-scm.com/) - Version control
- [npm](https://www.npmjs.com/) - Package manager

### Learning
- [JavaScript ES6+](https://javascript.info/)
- [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Progressive Web Apps](https://web.dev/progressive-web-apps/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## Code of Conduct

- Be respectful
- Provide helpful feedback
- Follow the existing code style
- Test your changes thoroughly

---

**Happy coding!** 🚀
