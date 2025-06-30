import nodemailer from "nodemailer";

interface SendEmailParams {
  email: string;
  subject: string;
  message: string;
}

export const sendEmail = async ({
  email,
  subject,
  message,
}: SendEmailParams) => {
  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    let mailOptions = {
      from: process.env.GMAIL_USERNAME,
      to: email,
      subject: subject,
      html: message,
    };

    let info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw error;
  }
};
