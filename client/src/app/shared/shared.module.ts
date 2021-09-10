import { NgModule } from '@angular/core';
import { MomentFormatPipe } from './pipes/moment-format.pipe';
import { SafeHtmlPipe } from './pipes/index';
import { PaginationComponent } from './pagination/pagination.component';
import { CommonModule } from '@angular/common';
import { AdminGuard } from './admin.guard';
import { FileSizePipe } from './pipes/file-size.pipe';
import { GenericConfirmComponent } from './generic-confirm/generic-confirm.component';
import { CoreClientModule } from '@aitheon/core-client';

@NgModule({
  imports: [
    CommonModule,
    CoreClientModule
  ],
  providers: [
    AdminGuard
  ],
  declarations: [
    MomentFormatPipe,
    SafeHtmlPipe,
    FileSizePipe,
    PaginationComponent,
    GenericConfirmComponent
  ],
  exports: [
    MomentFormatPipe,
    SafeHtmlPipe,
    FileSizePipe,
    PaginationComponent,
    GenericConfirmComponent
  ]
})
export class SharedModule { }
