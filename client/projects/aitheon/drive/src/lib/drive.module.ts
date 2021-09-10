import { NgModule, Optional, ModuleWithProviders, SkipSelf } from '@angular/core';
import { ApiModule } from './rest/api.module';
import { Configuration } from './rest/configuration';

@NgModule({
  declarations: [
  ],
  imports: [
    ApiModule
  ],
  providers: [
  ],
  exports: [
    ApiModule
  ]
})
export class DriveModule {
  public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders {
    return {
      ngModule: DriveModule,
      providers: [
        { provide: Configuration, useFactory: configurationFactory }
      ]
    };
  }
  constructor(@Optional() @SkipSelf() parentModule: DriveModule) {
    if (parentModule) {
      throw new Error('DriveModule is already loaded. Import in your base AppModule only.');
    }
  }
}
// dist
