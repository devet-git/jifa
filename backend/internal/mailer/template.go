package mailer

import "fmt"

// RenderBody wraps inner HTML in a full email template that renders
// consistently across major clients: Outlook 2007+ (Windows desktop),
// Outlook.com, Gmail (web/mobile), Apple Mail, Yahoo Mail. Uses
// table-based layout, all inline styles, and MSO conditional fallbacks
// for Outlook. The brand colors mirror the in-app J+F logo gradient.
//
// preview is the inbox preview snippet (hidden in the rendered body).
func RenderBody(preview, innerHTML string) string {
	return fmt.Sprintf(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Jifa</title>
<!--[if mso]>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
<o:AllowPNG/>
</o:OfficeDocumentSettings>
</xml>
<style type="text/css">
table, td, div, p, a, span { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;width:100%%;background-color:#f3f4f6;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;overflow:hidden;mso-hide:all;">%s</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="background-color:#f3f4f6;">
<tr>
<td align="center" style="padding:32px 12px;">
<!--[if mso]>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px;"><tr><td>
<![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width:600px;width:100%%;background-color:#ffffff;border-radius:12px;border-collapse:separate;">
  <tr>
    <td bgcolor="#4f46e5" align="left" style="background-color:#4f46e5;background-image:linear-gradient(135deg,#6366f1 0%%,#8b5cf6 100%%);border-radius:12px 12px 0 0;padding:24px 32px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td width="40" height="40" align="center" valign="middle" bgcolor="#ffffff" style="background-color:#ffffff;border-radius:9px;width:40px;height:40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#4f46e5;line-height:40px;letter-spacing:-0.3px;mso-line-height-rule:exactly;">JF</td>
          <td style="padding-left:14px;vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;line-height:40px;letter-spacing:-0.3px;mso-line-height-rule:exactly;">Jifa</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 36px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#374151;">
      %s
    </td>
  </tr>
  <tr>
    <td bgcolor="#f9fafb" align="center" style="background-color:#f9fafb;padding:22px 32px;text-align:center;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#4b5563;line-height:1.4;">Jifa &mdash; Project Management</p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">You received this email because of activity on your Jifa account.<br>This is an automated message &mdash; please do not reply.</p>
    </td>
  </tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->
</td>
</tr>
</table>
</body>
</html>`, preview, innerHTML)
}

// RenderButton creates an email-safe call-to-action button. Outlook
// desktop gets a VML roundrect with matching dimensions; every other
// client gets a styled anchor. The button label is the only visible
// text — the destination URL is never exposed in the rendered body.
func RenderButton(url, text string) string {
	return fmt.Sprintf(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
<tr>
<td align="center" bgcolor="#4f46e5" style="border-radius:8px;background-color:#4f46e5;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="%s" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="16%%" strokecolor="#4f46e5" fillcolor="#4f46e5">
<w:anchorlock/>
<center style="color:#ffffff;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;letter-spacing:0.2px;">%s</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="%s" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;background-color:#4f46e5;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.2;border-radius:8px;mso-hide:all;letter-spacing:0.2px;">%s</a>
<!--<![endif]-->
</td>
</tr>
</table>`, url, text, url, text)
}

// RenderTextLink creates a styled inline text link safe across all clients.
// The visible text is the only thing rendered — the URL is hidden behind
// the descriptive label. Use this for secondary actions ("View all
// notifications", "Manage preferences", etc.).
func RenderTextLink(url, text string) string {
	return fmt.Sprintf(`<a href="%s" target="_blank" rel="noopener noreferrer" style="color:#4f46e5;text-decoration:none;font-weight:600;border-bottom:1px solid rgba(79,70,229,0.35);">%s</a>`, url, text)
}

// RenderSpacer adds a vertical spacer row that renders the same height in
// every client (Outlook included).
func RenderSpacer(height int) string {
	return fmt.Sprintf(`<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%%"><tr><td style="height:%dpx;line-height:%dpx;font-size:1px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`, height, height)
}
