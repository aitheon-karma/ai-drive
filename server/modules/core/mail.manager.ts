import { environment } from '../../environment';
import * as nodemailer from 'nodemailer';
import * as inlineCss from 'nodemailer-juice';

export class MailManager {

    private smtpTransport: any;
    constructor() {
        this.init();
    }

    private init() {
        console.log('Mailer init...');
        const config = Object.assign({ host: '', port: '' }, environment.mailer);
        config.host = 'ai-mail.ai-mail.svc.cluster.local';
        config.port = process.env.AI_MAIL_SERVICE_PORT_SMTP || '25';
        if (!environment.production) {
            config.host = 'localhost';
            config.port = '2525';
        }
        console.log('smtpTransport setting to service', config.host, config.port);
        const smtpTransport = nodemailer.createTransport(config as any);
        smtpTransport.use('compile', inlineCss());

        this.smtpTransport = smtpTransport;
    }

    async sendMail(mailOptions: any): Promise<void> {
        return new Promise<any>((resolve, reject) => {
            this.smtpTransport.sendMail(mailOptions, (err: any) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

}
