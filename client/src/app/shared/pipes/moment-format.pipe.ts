import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({ name: 'momentFormat' })
export class MomentFormatPipe implements PipeTransform {
  constructor() {}
  public transform(value: string, format: string, utc: boolean = true): string {
    if (utc) {
      return moment.utc(value).format(format);
    } else {
      return moment.utc(value).format(format);
    }
  }
}
