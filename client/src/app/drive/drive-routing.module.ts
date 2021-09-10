import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DriveComponent } from './drive.component';

const routes: Routes = [
  {
    path: '', component: DriveComponent
  },
  // {
  //   path: 'folders/:folderId', component: DriveComponent
  // },
  {
    path: 'shared/:shareType/:shareId', component: DriveComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DriveRoutingModule { }
