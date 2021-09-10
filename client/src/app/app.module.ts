import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { SweetAlert2Module } from '@toverux/ngx-sweetalert2';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ProgressbarModule } from 'ngx-bootstrap/progressbar';
import { DashboardModule } from './dashboard/dashboard.module';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { ModalModule } from 'ngx-bootstrap/modal';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { DndModule } from 'ng2-dnd';
import { CoreClientModule } from '@aitheon/core-client';
import { Configuration, ConfigurationParameters, DriveModule as DriveRestModule } from '@aitheon/drive';
import { environment } from '../environments/environment';
import { DriveModule } from './drive/drive.module';

export function apiConfigFactory (): Configuration {
  const params: ConfigurationParameters = {
    basePath: '.'
  };
  return new Configuration(params);
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserAnimationsModule,
    CoreClientModule.forRoot({
      baseApi: environment.baseApi,
      production: environment.production,
      service: environment.service
    }),
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    AppRoutingModule,
    DashboardModule,
    TabsModule.forRoot(),
    ModalModule.forRoot(),
    DndModule.forRoot(),
    DriveRestModule.forRoot(apiConfigFactory),
    DriveModule,
    BsDatepickerModule.forRoot(),
    ProgressbarModule.forRoot(),
    TooltipModule.forRoot(),
    SweetAlert2Module.forRoot({
        buttonsStyling: false,
        confirmButtonClass: 'btn btn-primary ripple-effect mr-4',
        cancelButtonClass: 'btn btn-secondary ripple-effect'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
