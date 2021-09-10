import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { SharedModule } from '../shared/shared.module';
import { ProgressbarModule } from 'ngx-bootstrap/progressbar';
import { NewsService } from './shared/news.service';
import { CoreClientModule } from '@aitheon/core-client';

@NgModule({
  imports: [
    CoreClientModule,
    SharedModule,
    DashboardRoutingModule,
    ProgressbarModule
  ],
  declarations: [DashboardComponent],
  providers: [NewsService]
})
export class DashboardModule { }
