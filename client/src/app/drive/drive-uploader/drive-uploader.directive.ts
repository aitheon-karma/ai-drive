import { Directive, EventEmitter, ElementRef, HostListener, Input, Output, NgZone, ViewContainerRef, ComponentFactoryResolver, ComponentRef, HostBinding, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { DriveUploaderService } from './drive-uploader.service';

@Directive({ selector: '[flDriveUploader]' })
export class DriveUploaderDirective implements OnInit {

  @Input() disabled = false;

  public constructor(
    private driveUploaderService: DriveUploaderService
  ) {
  }

  ngOnInit(): void {
  }

  @HostBinding('class.drive-uploader') isDriveUploader = true;

  @HostListener('dragover', [ '$event' ])
  public onDragOver(event: any): void {
    if (!this.disabled && event.dataTransfer.types.length > 0){
      this.driveUploaderService.showDropZone();
    }
  }

}
