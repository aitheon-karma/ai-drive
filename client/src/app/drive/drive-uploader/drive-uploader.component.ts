import { Component, OnInit, NgZone, EventEmitter, Input, Output } from '@angular/core';
import { AuthService } from '@aitheon/core-client';
import { ToastrService } from 'ngx-toastr';
import { FileUploader, FileItem } from 'ng2-file-upload';
import { Document } from '../shared/document';
import { DriveUploaderService } from './drive-uploader.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'fl-drive-uploader',
  templateUrl: './drive-uploader.component.html',
  styleUrls: ['./drive-uploader.component.scss']
})
export class DriveUploaderComponent implements OnInit {

  @Input() disabled = false;
  @Input() folder: string;
  @Input() service: { _id: string; key: string };
  @Output() successItem: EventEmitter<Document> = new EventEmitter<Document>();

  closed = new EventEmitter();
  uploader: FileUploader;
  authToken: string;
  isFileOver: boolean;
  documents: Document[];
  showUploaderResults = false;

  public constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    private zone: NgZone,
    public driveUploaderService: DriveUploaderService
  ) {
    this.authService.token.subscribe((token: string) => {
      this.authToken = token;
    });

    this.uploader = this.initUploader();
  }

  ngOnInit() {
    this.uploader = this.initUploader();
  }

  fileOverBase(e: boolean){
    this.isFileOver = e;
    if (!this.isFileOver){
      this.driveUploaderService.hideDropZone();
    }
  }


  initUploader(): FileUploader {

    const uploadUrl = environment.production ? '/drive/api/documents' : '/api/documents';

    this.uploader = new FileUploader({
      url: uploadUrl,
      method: 'POST',
      authToken: 'JWT ' + this.authToken,
      autoUpload: true,
      removeAfterUpload: false
    });

    /**
     * Events
     */
    this.uploader.onSuccessItem = (fileItem: FileItem, response: any) => {
      setTimeout(() => {
        fileItem.remove();
        if (this.uploader.queue.length === 0){
          this.showUploaderResults = false;
        }
      }, 1000);
      this.successItem.emit(JSON.parse(response));

      // file.fileItem = undefined;
      // file.uploadingFinished = true;
      // file = Object.assign(file, JSON.parse(response));
      // this.toastr.success('Document uploaded');
    };

    this.uploader.onAfterAddingFile = (fileItem: FileItem) => {
      this.showUploaderResults = true;
      // this.driveUploaderService.
      // const document = new Document();

      // document.name = fileItem.file.name;
      // document.size = fileItem.file.size;
      // document.contentType = fileItem.file.type;

      // document.uploading = true;
      // document.uploadingProgress = 0;

      // this.documents.push(document);
    };

    this.uploader.onWhenAddingFileFailed = (item: any, filter: any, options: any) => {

    };

    this.uploader.onBuildItemForm = (fileItem: FileItem, form: any) => {
      form.append('name', fileItem.file.name);
      if (this.service){
        form.append('service', JSON.stringify(this.service));
      }
      if (this.folder){
        form.append('folder', this.folder);
      }
    };
    this.uploader.onErrorItem = (fileItem: FileItem, response: any, status: any) => {
      try {
        response = JSON.parse(response);
        response = response.message;
      } catch (err) { }
      // const fileIndex = this.documents.findIndex((c: Document) => c.fileItem && c.fileItem.index === fileItem.index);
      // if (fileIndex > -1) {
      //   this.documents.splice(fileIndex, 1);
      // }
      fileItem.remove();
      this.showUploaderResults = false;
      this.toastr.error(`${fileItem.file.name} ${response} `, `Upload error (${status}) `);
    };
    this.uploader.onProgressItem = (fileItem: FileItem, progress: any) => {
      this.onProgressItem(fileItem, progress);
    }

    return this.uploader;
  }

  onProgressItem(fileItem: FileItem, progress: any): void {
    // const document = this.documents.find((c: Document) => c.fileItem && c.fileItem.index === fileItem.index);
    // if (document) {
    //   this.zone.run(() => {
    //     document.uploadingProgress = progress;
    //     console.log('file.uploadingProgress', document.uploadingProgress);
    //   });
    // }
  };



}
