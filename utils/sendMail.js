require('dotenv').config();
import { createTransport } from 'nodemailer';
import { renderFile } from 'ejs';
import { join } from 'path';

const sendMail = async (options) => {
    const transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const { email, subject, template, data } = options;

    // get the path to the email template file
    const templatePath = join(__dirname, '../mails', template);

    // Render the email template with EJS
    const html = await renderFile(templatePath, data);

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html
    };

    await transporter.sendMail(mailOptions);
};

export default sendMail;