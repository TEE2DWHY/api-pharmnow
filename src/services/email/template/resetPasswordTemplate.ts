interface ResetPasswordProps {
  resetToken: string;
  fullname: string;
  year: number;
  resetUrl?: string;
}

const resetPasswordTemplate = ({
  resetToken,
  fullname,
  year,
  resetUrl,
}: ResetPasswordProps) => {
  const passwordResetUrl =
    resetUrl || `https://pharmnow.app/reset-password?token=${resetToken}`;

  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
      <title>Reset Your PharmNow Password</title>
      
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
          
          .button {
            width: 100% !important;
            padding: 16px 20px !important;
            font-size: 16px !important;
          }
          
          .token-container {
            padding: 15px !important;
          }
          
          .token-text {
            font-size: 12px !important;
            word-break: break-all !important;
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
                <td class="header" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 40px; text-align: center; border-radius: 12px 12px 0 0;">
                  <!-- Logo -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding-bottom: 20px;">
                        <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto;">
                          <span style="font-size: 28px; font-weight: bold; color: #dc2626;">🔒</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">PharmNow</h1>
                        <p style="color: #fecaca; font-size: 16px; margin: 8px 0 0 0;">Password Reset Request</p>
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
                        <h2 style="color: #1f2937; font-size: 24px; font-weight: 600; margin: 0 0 12px 0;">Reset Your Password</h2>
                        <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0;">
                          Hi ${fullname}, we received a request to reset your PharmNow account password. Click the button below to set a new password.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Reset Button -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 30px 0;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td class="button" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px; text-align: center; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                              <a href="${passwordResetUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 18px; border-radius: 8px;">
                                Reset My Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #6b7280; font-size: 14px; margin: 15px 0 0 0;">
                          This link expires in <strong>1 hour</strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Alternative Token Section -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="text-align: center; padding: 20px 0;">
                        <div style="background-color: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                          <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 15px 0;">
                            Can't click the button? Copy and paste this link in your browser:
                          </p>
                          <div class="token-container" style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; margin: 0 auto; max-width: 500px;">
                            <p class="token-text" style="color: #6b7280; font-size: 13px; font-family: monospace; word-break: break-all; margin: 0; line-height: 1.4;">
                              ${passwordResetUrl}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Instructions -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="text-align: center; padding: 30px 0;">
                        <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                          <p style="color: #92400e; font-size: 14px; line-height: 1.5; margin: 0;">
                            <strong>⚠️ Important:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                          </p>
                        </div>
                        
                        <!-- Steps -->
                        <div style="text-align: left; background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                          <h3 style="color: #374151; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">How to reset your password:</h3>
                          <ol style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Click the "Reset My Password" button above</li>
                            <li style="margin-bottom: 8px;">You'll be taken to a secure page</li>
                            <li style="margin-bottom: 8px;">Enter your new password</li>
                            <li style="margin-bottom: 0;">Confirm your new password and save</li>
                          </ol>
                        </div>
                        
                        <!-- Alternative App Button -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                          <tr>
                            <td style="background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; text-align: center;">
                              <a href="#" style="display: inline-block; padding: 12px 28px; color: #374151; text-decoration: none; font-weight: 500; font-size: 14px; border-radius: 8px;">
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
                        <div style="background-color: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                          <p style="color: #991b1b; font-size: 13px; line-height: 1.4; margin: 0; text-align: center;">
                            🚨 <strong>Security Alert:</strong> This password reset was requested from your account. If this wasn't you, please contact our support team immediately.
                          </p>
                        </div>
                        <p style="color: #6b7280; font-size: 13px; line-height: 1.4; margin: 0; text-align: center;">
                          For your security, this reset link can only be used once and expires in 1 hour. PharmNow staff will never ask for your password or reset links.
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
                    <a href="mailto:support@pharmnow.com" style="color: #dc2626; text-decoration: none;">support@pharmnow.com</a>
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

export default resetPasswordTemplate;
