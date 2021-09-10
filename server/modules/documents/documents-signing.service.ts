import { Service, Inject } from 'typedi';
import { DocumentSchema, DriveDocument } from './document.model';
import { S3Manager } from '../core/s3-manager';
import * as path from 'path';
import * as hummus from 'hummus';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as _ from 'lodash';
import * as moment from 'moment';
import { DocumentControl } from './document-control.model';
import { User } from '@aitheon/core-server';
import { SignaturesService } from '../signatures/signatures.service';
const forge = require('node-forge');


@Service()
export class DocumentsSigningService {

  @Inject()
  signaturesService: SignaturesService;

  private s3Manager: S3Manager;
  private byteRangePlaceholder = 123456789;
  private p12Path = path.resolve('./server/environment/certificate.p12');

  constructor() {
    this.s3Manager = new S3Manager();
  }

  async sign(document: DriveDocument, controls: DocumentControl[], currentUser: User): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      let buildDir: string;
      try {
        buildDir = path.resolve(`./pdf-builds/${document._id.toString()}_${new Date().getTime()}`);
        fs.mkdirSync(buildDir);
        const modifiedFilePath = `${buildDir}/modify_${document.name}`;
        const pdfFilePath = `${buildDir}/original_${document.name}`;

        await this.s3Manager.downloadFile(document.storeKey, pdfFilePath);
        const pdfWriter = hummus.createWriterToModify(pdfFilePath, {
          modifiedFilePath: modifiedFilePath,
          version: hummus.ePDFVersion14
        });

        /**
         * Signature object writer
         */
        const writeSignature = (): number => {
          let result;
          const objectsContext = pdfWriter.getObjectsContext();
          result = objectsContext.startNewIndirectObject();
          const dictionaryContext = objectsContext.startDictionary();
          const txt = `${'0'.repeat(2 * 8192)}`;
          dictionaryContext
            .writeKey('Type')
            .writeNameValue('Sig')
            .writeKey('Filter')
            .writeNameValue('Adobe.PPKLite')
            .writeKey('SubFilter')
            .writeNameValue('adbe.pkcs7.detached')
            .writeKey('ByteRange')
            .writeRectangleValue([0, this.byteRangePlaceholder, this.byteRangePlaceholder, this.byteRangePlaceholder])
            .writeKey('Contents')
            .writeLiteralStringValue(pdfWriter.createPDFTextString(txt).toBytesArray())
            .writeKey('Reason')
            .writeLiteralStringValue(pdfWriter.createPDFTextString('Diginally verifiable PDF exported from www.aitheon.com').toBytesArray())
            .writeKey('M')
            .writeLiteralStringValue(pdfWriter.createPDFDate(new Date()).toString());
            // .writeKey('Prop_Build')
            // .writeLiteralStringValue(pdfWriter.createPDFTextString('</App<</Name/Aitheon#ae>>').toBytesArray());

          objectsContext
            .endDictionary(dictionaryContext)
            .endIndirectObject();
          return result;
        };

        /**
         * Put a invisible widget with reference to signature
         * @param signatureReference refecence number to signature
         * @param pageReference page reference
         */
        const writeWidget = (signatureReference: number, pageReference: number): number => {
          let result;

          const objectsContext = pdfWriter.getObjectsContext();
          result = objectsContext.startNewIndirectObject();
          const dictionaryContext = objectsContext.startDictionary();

          dictionaryContext
            .writeKey('Type')
            .writeNameValue('Annot')
            .writeKey('Subtype')
            .writeNameValue('Widget')
            .writeKey('FT')
            .writeNameValue('Sig')
            .writeKey('Rect')
            .writeRectangleValue([0, 0, 0, 0])
            .writeKey('V')
            .writeObjectReferenceValue(signatureReference)
            .writeKey('T')
            .writeLiteralStringValue(pdfWriter.createPDFTextString(`DOCUMENTID_${ document._id.toString() }`).toBytesArray())
            .writeKey('F')
            .writeNumberValue(4)
            .writeKey('P')
            .writeObjectReferenceValue(pageReference);

          objectsContext
            .endDictionary(dictionaryContext)
            .endIndirectObject();

          return result;
        };

        const writeSigFlags = (pageRef: number) => {
          let result;
          const objectsContext = pdfWriter.getObjectsContext();
          result = objectsContext.startNewIndirectObject();
          const dictionaryContext = objectsContext.startDictionary();

          dictionaryContext
            .writeKey('SigFlags')
            .writeNumberValue(3);

          dictionaryContext.writeKey('Fields');
          objectsContext.startArray();
          dictionaryContext.writeObjectReferenceValue(pageRef);
          objectsContext.endArray(hummus.eTokenSeparatorEndLine);
          objectsContext
            .endDictionary(dictionaryContext)
            .endIndirectObject();

          return result;
        };

        const copyingContext = pdfWriter.createPDFCopyingContextForModifiedFile();

        const pageIndex = 0;
        const firstPageID = copyingContext.getSourceDocumentParser().getPageObjectID(pageIndex);
        const firstPageObject = copyingContext.getSourceDocumentParser().parsePage(pageIndex).getDictionary().toJSObject();
        const objectsContext = pdfWriter.getObjectsContext();

        pdfWriter.getEvents().on('OnCatalogWrite', (params: any) => {
          params.catalogDictionaryContext.writeKey('AcroForm');
          params.catalogDictionaryContext.writeObjectReferenceValue(sigFlagsRef);
        });

        const signatureRef = writeSignature();
        const widgetRef = writeWidget(signatureRef, firstPageID);
        const sigFlagsRef = writeSigFlags(widgetRef);

        objectsContext.startModifiedIndirectObject(firstPageID);
        const modifiedPageObject = pdfWriter.getObjectsContext().startDictionary();

        Object.getOwnPropertyNames(firstPageObject).forEach(function (element, index, array) {
          if (element != 'Annots') {
            modifiedPageObject.writeKey(element);
            copyingContext.copyDirectObjectAsIs(firstPageObject[element]);
          }
        });

        modifiedPageObject.writeKey('Annots');
        objectsContext.startArray();
        objectsContext.writeIndirectObjectReference(widgetRef);
        objectsContext
          .endArray()
          .endLine()
          .endDictionary(modifiedPageObject)
          .endIndirectObject();


        /**
         * Download signature files
         */
        const signatureControls = _.uniqBy(controls.filter((docControl: DocumentControl) => {
          return docControl.type === 'SIGNATURE';
        }), (e) => {
          return e._id.toString();
        });
        if (signatureControls.length > 0) {
          const controlPromises = signatureControls.map((docControl: DocumentControl) => {
            return this.signaturesService.download(docControl.signature, `${ buildDir }/${ docControl.signature._id }.png`);
          });
          await Promise.all(controlPromises);
        }
        // Prop_Build<</App<</Name/DocuSign#ae>>>

        const controlsByPages = _.groupBy(controls, (docControl: DocumentControl) => {
          return docControl.pageNumber;
        });
        const font = pdfWriter.getFontForFile(path.resolve('server/modules/documents/fonts/arial.ttf'));
        _.forEach(controlsByPages, (pageControls: DocumentControl[], pageNumber: any) => {
          const pageIndex = parseInt(pageNumber) - 1;
          const pageModifier = new hummus.PDFPageModifier(pdfWriter, pageIndex);
          const cxt = pageModifier.startContext().getContext();

          const pageObject = copyingContext.getSourceDocumentParser().parsePage(pageIndex);
          const mediaBox = pageObject.getMediaBox();
          const pageWidth = mediaBox[2];
          const pageHeight = mediaBox[3];

          const imageHeight = 55;
          const imageWidth = 110;
          const fontSize = 12;
          let text;
          let textDimensions;

          pageControls.forEach((docControl: DocumentControl) => {
            let realY = pageHeight - docControl.position.y;
            const realX = docControl.position.x;

            if (realY < 0) {
              realY = 0;
            }
            if (realY > pageHeight) {
              realY = pageHeight;
            }
            switch (docControl.type) {
              case 'SIGNATURE':
                realY -= imageHeight;
                cxt.drawImage(realX, realY, `${ buildDir }/${ docControl.signature._id }.png`, {
                  transformation: { width: imageWidth, height: imageHeight, proportional: true }
                });
                break;
              case 'FULL_NAME':
                text = `${ currentUser.profile.firstName } ${ currentUser.profile.lastName }`;
                textDimensions = font.calculateTextDimensions(text, fontSize);
                realY -= textDimensions.height;
                cxt.writeText(text, realX, realY, {
                  font: font,
                  size: fontSize,
                  color: 0x00,
                  colorspace: 'gray'
                });
                break;
              case 'DATE_SIGNED':
                text = `${ moment().format('MM/DD/YYYY') }`;
                textDimensions = font.calculateTextDimensions(text, fontSize);
                realY -= textDimensions.height;
                cxt.writeText(text, realX, realY, {
                  font: font,
                  size: fontSize,
                  color: 0x00,
                  colorspace: 'gray'
                });
                break;
            }
          });
          pageModifier.endContext().writePage();
        });


        pdfWriter.requireCatalogUpdate();

        pdfWriter.end();

        const pdfBuffer = fs.readFileSync(modifiedFilePath);
        const p12Buffer = fs.readFileSync(this.p12Path);

        const resultBuffer = await this.addSignature(pdfBuffer, p12Buffer);

        // fs.writeFileSync('test.pdf', resultBuffer);
        rimraf(buildDir, () => { });

        resolve(resultBuffer);
      } catch (err) {
        if (buildDir) {
          rimraf(buildDir, () => { });
        }
        reject(err);
      }
    });
  }

  private addSignature(pdfBuffer: Buffer, p12Buffer: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const options = {
        asn1StrictParsing: false,
        passphrase: '',
      };

      let pdf = pdfBuffer;
      const lastChar = pdfBuffer.slice(pdfBuffer.length - 1).toString();
      if (lastChar === '\n') {
        // remove the trailing new line
        pdf = pdf.slice(0, pdf.length - 1);
      }

      // Find the ByteRange placeholder.
      const byteRangePlaceholder = [
        0,
        this.byteRangePlaceholder,
        this.byteRangePlaceholder,
        this.byteRangePlaceholder,
      ];
      const byteRangeString = `/ByteRange [ ${byteRangePlaceholder.join(' ')} ]`;
      const byteRangePos = pdf.indexOf(byteRangeString);
      if (byteRangePos === -1) {
        return reject(`Could not find ByteRange placeholder: ${byteRangeString}`);
      }

      // Calculate the actual ByteRange that needs to replace the placeholder.
      const byteRangeEnd = byteRangePos + byteRangeString.length;
      const contentsTagPos = pdf.indexOf('/Contents ', byteRangeEnd);
      const placeholderPos = pdf.indexOf('(', contentsTagPos);
      const placeholderEnd = pdf.indexOf(')', placeholderPos);
      const placeholderLengthWithBrackets = (placeholderEnd + 1) - placeholderPos;
      const placeholderLength = placeholderLengthWithBrackets - 2;
      const byteRange = [0, 0, 0, 0];
      byteRange[1] = placeholderPos;
      byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
      byteRange[3] = pdf.length - byteRange[2];
      let actualByteRange = `/ByteRange [ ${byteRange.join(' ')} ]`;
      actualByteRange += ' '.repeat(byteRangeString.length - actualByteRange.length);

      // Replace the /ByteRange placeholder with the actual ByteRange
      pdf = Buffer.concat([
        pdf.slice(0, byteRangePos),
        Buffer.from(actualByteRange),
        pdf.slice(byteRangeEnd),
      ]);

      // Remove the placeholder signature
      pdf = Buffer.concat([
        pdf.slice(0, byteRange[1]),
        pdf.slice(byteRange[2], byteRange[2] + byteRange[3]),
      ]);

      // Convert Buffer P12 to a forge implementation.
      const forgeCert = forge.util.createBuffer(p12Buffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(forgeCert);
      const p12 = forge.pkcs12.pkcs12FromAsn1(
        p12Asn1,
        options.asn1StrictParsing,
        options.passphrase,
      );

      // Extract safe bags by type.
      // We will need all the certificates and the private key.
      const certBags = p12.getBags({
        bagType: forge.pki.oids.certBag,
      })[forge.pki.oids.certBag];
      const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      })[forge.pki.oids.pkcs8ShroudedKeyBag];

      const privateKey = keyBags[0].key;
      // Here comes the actual PKCS#7 signing.
      const p7 = forge.pkcs7.createSignedData();
      // Start off by setting the content.
      p7.content = forge.util.createBuffer(pdf.toString('binary'));

      // Then add all the certificates (-cacerts & -clcerts)
      // Keep track of the last found client certificate.
      // This will be the public key that will be bundled in the signature.
      // Note: This first line may still result in setting a CA cert in
      // the lastClientCertificate. Keeping it this way for backwards comp.
      // Will get rid of it once this lib gets to version 0.3.
      let certificate = certBags[0];

      Object.keys(certBags).forEach((i) => {
        const { publicKey } = certBags[i].cert;

        p7.addCertificate(certBags[i].cert);

        // Try to find the certificate that matches the private key.
        if (privateKey.n.compareTo(publicKey.n) === 0 &&
          privateKey.e.compareTo(publicKey.e) === 0
        ) {
          certificate = certBags[i].cert;
        }
      });

      // Add a sha256 signer. That's what Adobe.PPKLite adbe.pkcs7.detached expects.
      p7.addSigner({
        key: privateKey,
        certificate,
        digestAlgorithm: forge.pki.oids.sha256,
        authenticatedAttributes: [
          {
            type: forge.pki.oids.contentType,
            value: forge.pki.oids.data,
          }, {
            type: forge.pki.oids.messageDigest,
            // value will be auto-populated at signing time
          }, {
            type: forge.pki.oids.signingTime,
            // value can also be auto-populated at signing time
            // We may also support passing this as an option to sign().
            // Would be useful to match the creation time of the document for example.
            value: new Date(),
          },
        ],
      });

      // Sign in detached mode.
      p7.sign({ detached: true });

      // Check if the PDF has a good enough placeholder to fit the signature.
      const raw = forge.asn1.toDer(p7.toAsn1()).getBytes();
      // placeholderLength represents the length of the HEXified symbols but we're
      // checking the actual lengths.
      if ((raw.length * 2) > placeholderLength) {
        return reject(`Signature exceeds placeholder length: ${raw.length * 2} > ${placeholderLength}`);
      }

      let signature = stringToHex(raw);
      // Store the HEXified signature. At least useful in tests.
      // this.lastSignature = signature;

      // Pad the signature with zeroes so the it is the same length as the placeholder
      signature += Buffer
        .from(String.fromCharCode(0).repeat((placeholderLength / 2) - raw.length))
        .toString('hex');

      // Place it in the document.
      pdf = Buffer.concat([
        pdf.slice(0, byteRange[1]),
        Buffer.from(`<${signature}>`),
        pdf.slice(byteRange[1]),
      ]);

      // Magic. Done.
      return resolve(pdf);
    });
  }

}

function pad2(num: any) {
  const s = `0${num}`;
  return s.substr(s.length - 2);
}

function stringToHex(s: any) {
  let a = '';
  for (let i = 0; i < s.length; i += 1) {
    a += pad2(s.charCodeAt(i).toString(16));
  }
  return a;
}

function PDFComment(inText: any, inCommentator: any, inPosition: any, inColor: any, flag: any, inReplyTo?: any) {
  const that = {} as any;
  that.time = new Date();
  that.text = inText;
  that.commentator = inCommentator;
  that.position = inPosition;
  that.color = inColor;
  that.replyTo = inReplyTo;
  that.objectID = 0;
  that.flag = flag;
  return that;
}
