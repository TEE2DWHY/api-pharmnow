interface VerifyEmailParams {
  verificationCode: string;
  fullname: string;
  year: number;
}

const verifyEmailMessage = ({
  verificationCode,
  fullname,
  year,
}: VerifyEmailParams) => {
  const digits = verificationCode.toString().padStart(4, "0").split("");
  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
      <title>Verify Your PharmNow Account</title>
      
      <style type="text/css">
        /* Reset and Base Styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body, table, td, p, h1, h2, h3 {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        
        img {
          border: 0;
          line-height: 100%;
          outline: none;
          text-decoration: none;
          -ms-interpolation-mode: bicubic;
        }
        
        /* Email Client Specific */
        .ExternalClass {
          width: 100%;
        }
        
        .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div {
          line-height: 100%;
        }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .content {
            padding: 20px !important;
          }
          
          .header {
            padding: 30px 20px !important;
          }
          
          .code-container {
            padding: 20px !important;
          }
          
          .digit {
            width: 50px !important;
            height: 50px !important;
            font-size: 24px !important;
            margin: 0 5px !important;
          }
        }
      </style>
    </head>
    
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            
            <!-- Main Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="container" style="background-color: #ffffff; width: 600px; max-width: 600px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <tr>
                <td class="header" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 40px; text-align: center; border-radius: 12px 12px 0 0;">
                  <!-- Logo -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
                          <span style="font-size: 28px; font-weight: bold; color: #2563eb;">⚕️</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">PharmNow</h1>
                        <p style="color: #dbeafe; font-size: 16px; margin: 8px 0 0 0;">Your trusted pharmacy partner</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td class="content" style="padding: 40px;">
                  
                  <!-- Welcome Message -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="text-align: center; padding-bottom: 30px;">
                        <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 12px 0;">Verify Your Account</h2>
                        <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0;">
                          Hi ${fullname}, welcome to PharmNow! Please use the verification code below to complete your account setup.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Verification Code -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" class="code-container" style="background-color: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0;">
                        <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                        
                        <!-- 4-Digit Code Display -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td class="digit" style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; width: 60px; height: 60px; text-align: center; vertical-align: middle; margin: 0 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                              <span style="font-size: 28px; font-weight: 700; color: #2563eb;">${digits[0]}</span>
                            </td>
                            <td class="digit" style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; width: 60px; height: 60px; text-align: center; vertical-align: middle; margin: 0 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                              <span style="font-size: 28px; font-weight: 700; color: #2563eb;">${digits[1]}</span>
                            </td>
                            <td class="digit" style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; width: 60px; height: 60px; text-align: center; vertical-align: middle; margin: 0 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                              <span style="font-size: 28px; font-weight: 700; color: #2563eb;">${digits[2]}</span>
                            </td>
                            <td class="digit" style="background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; width: 60px; height: 60px; text-align: center; vertical-align: middle; margin: 0 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                              <span style="font-size: 28px; font-weight: 700; color: #2563eb;">${digits[3]}</span>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                          This code expires in <strong>10 minutes</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Instructions -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="text-align: center; padding: 30px 0;">
                        <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                          <p style="color: #1e40af; font-size: 14px; line-height: 1.5; margin: 0;">
                            <strong>💡 Quick Tip:</strong> Enter this code in the PharmNow app to verify your email address and start ordering your medications with ease.
                          </p>
                        </div>
                        
                        <!-- CTA Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px; text-align: center;">
                              <a href="#" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                                Open PharmNow App
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Security Note -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="border-top: 1px solid #e5e7eb; padding-top: 25px;">
                        <p style="color: #6b7280; font-size: 13px; line-height: 1.4; margin: 0; text-align: center;">
                          🔒 <strong>Security Notice:</strong> Never share this verification code with anyone. PharmNow will never ask for your verification code via phone or email.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 12px 0;">
                    Need help? Contact our support team at 
                    <a href="mailto:support@pharmnow.com" style="color: #2563eb; text-decoration: none;">support@pharmnow.com</a>
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © ${year} PharmNow. All rights reserved.
                  </p>
                </td>
              </tr>
              
            </table>
            
          </td>
        </tr>
      </table>
      
      <!-- Gmail Spacing Fix -->
      <div style="display: none; white-space: nowrap; font: 15px courier; line-height: 0;">
        &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
      </div>
    </body>
  </html>
  `;
};

export default verifyEmailMessage;
