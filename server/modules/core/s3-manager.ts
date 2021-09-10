import { S3 } from 'aws-sdk';
import { environment } from '../../environment';
import { Readable } from 'stream';
import * as fs from 'fs';

export class S3Manager {

  private s3: S3;

  constructor() {
    this.init();
  }

  private init() {
    this.s3 = new S3({
      params: { Bucket: environment.aws_s3.bucket },
      credentials: environment.aws_s3.credentials
    });
  }

  async uploadFile(key: String, contentType: String, file: any): Promise<{ size: number }> {
    return new Promise<{ size: number }>((resolve, reject) => {
      const params = { Key: key, Body: file, ContentType: contentType } as S3.Types.PutObjectRequest;
      let currentSize = 0;
      const upload = this.s3.upload(params);

      upload.on('httpUploadProgress', function (ev) {
        if (ev.total) currentSize = ev.total;
      });

      upload.send(function (err, result) {
        if (err) {
          console.log('Error: AWS upload file: ', err);
          return reject(err);
        }
        console.log('File created: ', params.Key);
        resolve({ size: currentSize });
      });
    });
  }

  async getSignedUrl(key: String, name?: String, expiries: number = 120, download: boolean = false): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const params = { Key: key, Expires: expiries } as any;
      if (download) {
        params.ResponseContentDisposition = 'attachment; filename ="' + name + '"';
      }
      this.s3.getSignedUrl('getObject', params, (err, url) => {
        if (err) {
          return reject(err);
        }
        return resolve(url);
      });
    });
  }

  getStream(key: string, range?: string): Readable {
    const params = { Key: key } as S3.Types.GetObjectRequest;
    if (range) {
      params.Range = range;
    }
    return this.s3.getObject(params).createReadStream();
  }

  downloadFile(key: string, path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(path);
      this.getStream(key)
      .on('end', () => {
        return resolve();
      })
      .on('error', (error) => {
        return reject(error);
      }).pipe(file);
    });
  }

  async removeFile(key: String): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const params = { Key: key } as S3.Types.DeleteObjectRequest;
      this.s3.deleteObject(params, (err: any) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  async removeFiles(keys: String[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const params = { Delete: { Objects: keys.map((s: string) => { return { Key: s }; })} } as S3.Types.DeleteObjectsRequest;
      this.s3.deleteObjects(params, (err: any) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

}