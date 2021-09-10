import { Service, Inject } from 'typedi';
import { SignatureSchema, Signature } from './signature.model';
import { S3Manager } from '../core/s3-manager';
import { environment } from '../../environment';
import { Types } from 'mongoose';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
const Duplex = require('stream').Duplex;
import * as fs from 'fs';

@Service()
export class SignaturesService {

  s3Manager: S3Manager;
  algorithm = 'aes-256-ctr';

  constructor() {
    this.s3Manager = new S3Manager();
  }

  /**
   * Upload file and create a signature record
   * @param signature signature to create
   * @param file File to upload
   */
  async create(signature: Signature, file: any): Promise<Signature> {
    const signatureSchema = new SignatureSchema({ user: signature.user });
    const storeKey = `APP/USERS/${ signature.user }/sinatures/${ signatureSchema._id.toString() }${ path.extname(file.originalname) }`;

    const encrypt = crypto.createCipher(this.algorithm, environment.signaturePassword);
    const zip = zlib.createGzip();
    // pipe(zip).pipe(encrypt).on()

    zip.pipe(encrypt);

    const fileStream = this.bufferToStream(file.buffer).pipe(zip);
    const fileBuffer = await this.streamToBuffer(fileStream);

    // fs.writeFileSync('encrypted.png', fileBuffer);

    // const decrypt = crypto.createDecipher(this.algorithm, environment.signaturePassword);
    // const unzip = zlib.createGunzip();

    // unzip.pipe(decrypt);

    // const decryptFileStream = fs.createWriteStream('decrypted.png');
    // fs.createReadStream('encrypted.png').pipe(unzip).pipe(decryptFileStream);

    const fileResult = await this.s3Manager.uploadFile(storeKey, file.mimetype, fileBuffer);

    signatureSchema.storeKey = storeKey;
    signatureSchema.size = fileResult.size;

    return signatureSchema.save();
  }

  getStream(signature: Signature) {
    const stream = this.s3Manager.getStream(signature.storeKey);
    const decrypt = crypto.createDecipher(this.algorithm, environment.signaturePassword);
    const unzip = zlib.createGunzip();
    unzip.pipe(decrypt);
    return stream.pipe(unzip);
  }

   private streamToBuffer(stream: any) {
    return new Promise((resolve, reject) => {
      const buffers = [] as any;
      stream.on('error', reject);
      stream.on('data', (data: any) => buffers.push(data));
      stream.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  download(signature: Signature, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const stream = this.getStream(signature);
        const file = fs.createWriteStream(outputPath);
        stream
        .on('end', () => {
          return resolve();
        })
        .on('error', (error) => {
          return reject(error);
        }).pipe(file);
      } catch (err) {
        reject(err);
      }

    });
  }

  bufferToStream(buffer: any) {
    const stream = new Duplex();
    stream.push(buffer);
    // tslint:disable-next-line:no-null-keyword
    stream.push(null);
    return stream;
  }

  async findByUser(userId: string): Promise<Signature[]> {
    return SignatureSchema.find({ user: userId });
  }

  async findById(signatureId: string): Promise<Signature> {
    return SignatureSchema.findById(signatureId);
  }

  async remove(signatureId: string): Promise<Signature> {
    const signature = await SignatureSchema.findById(signatureId);
    await this.s3Manager.removeFile(signature.storeKey);
    return signature.remove();
  }

}
