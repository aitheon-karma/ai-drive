import { Component, OnInit, Input, Output, NgZone, EventEmitter } from '@angular/core';

declare const PDFJS: any;

@Component({
  selector: 'fl-pdf-viewer',
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit {

  @Input() url: string;
  @Output() pdfLoaded: EventEmitter<void> = new EventEmitter<void>();

  public pagesCount: number = 1;
  public pageNumber: number = 1;
  
  pdfDoc = null;
  pageRendering = false;
  pageNumPending = null;
  scale = 1;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  pdf: any;
  isLoading = true;

  constructor(public ngZone: NgZone) { }

  ngOnInit() {
    this.isLoading = true;
    this.canvas = document.getElementById('the-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.loadPDF();
  }


  /**
  * Get page info from document, resize canvas accordingly, and render page.
  * @param num Page number.
  */
  renderPage(num, eventEmitter: boolean = false) {
    this.pageRendering = true;
    // Using promise to fetch the page
    this.pdfDoc.getPage(num).then((page) => {
      var viewport = page.getViewport(this.scale);
      this.canvas.height = viewport.height;
      this.canvas.width = viewport.width;

      // Render PDF page into canvas context
      var renderContext = {
        canvasContext: this.ctx,
        viewport: viewport
      };
      var renderTask = page.render(renderContext);

      // Wait for rendering to finish
      renderTask.promise.then(() => {
        this.pageRendering = false;
        if (eventEmitter){
          this.pdfLoaded.emit();
        }
        if (this.pageNumPending !== null) {
          // New page rendering is pending
          this.renderPage(this.pageNumPending);
          this.pageNumPending = null;
        }
        this.isLoading = false;

      });
    });

  }

  /**
  * If another page rendering in progress, waits until the rendering is
  * finised. Otherwise, executes rendering immediately.
  */
  queueRenderPage(num) {
    if (this.pageRendering) {
      this.pageNumPending = num;
    } else {
      this.renderPage(num);
    }
  }

  /**
  * Displays previous page.
  */
  prevPage() {
    if (this.pageNumber <= 1) {
      return;
    }
    this.pageNumber--;
    this.queueRenderPage(this.pageNumber);
  }

  /**
  * Displays next page.
  */
  nextPage() {
    if (this.pageNumber >= this.pdfDoc.numPages) {
      return;
    }
    this.pageNumber++;
    this.queueRenderPage(this.pageNumber);
  }

  loadPDF(){
    // Disable workers to avoid yet another cross-origin issue (workers need
    // the URL of the script to be loaded, and dynamically loading a cross-origin
    // script does not work).
    
    PDFJS.disableWorker = true;

    
    // In cases when the pdf.worker.js is located at the different folder than the
    // pdf.js's one, or the pdf.js is executed via eval(), the workerSrc property
    // shall be specified.
    
    PDFJS.workerSrc = 'pdfjs-dist/build/pdf.worker.js';
    /**
    // * Asynchronously downloads PDF.
    // */
  
    PDFJS.getDocument(this.url).then((pdfDoc_) => {
      this.ngZone.run(() => {
        this.pdfDoc = pdfDoc_;
        this.renderPage(this.pageNumber, true);
        this.pagesCount = this.pdfDoc.numPages;
      });
      // Initial/first page rendering
    });

    
  }

}
