import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DriveUploaderComponent } from './drive-uploader.component';

describe('DriveUploaderComponent', () => {
  let component: DriveUploaderComponent;
  let fixture: ComponentFixture<DriveUploaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DriveUploaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DriveUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
