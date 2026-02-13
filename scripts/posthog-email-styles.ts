export const baseStyles = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f5f5f5;
  }
  .container {
    background: #ffffff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
  }
  .content {
    padding: 30px;
  }
  .content p {
    margin: 0 0 16px;
  }
  .content ul, .content ol {
    margin: 0 0 16px;
    padding-left: 24px;
  }
  .content li {
    margin-bottom: 8px;
  }
  .button {
    display: inline-block;
    padding: 14px 28px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white !important;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 500;
    margin: 16px 0;
  }
  .button:hover {
    opacity: 0.9;
  }
  .footer {
    padding: 20px 30px;
    background: #f8f9fa;
    border-top: 1px solid #e9ecef;
    font-size: 13px;
    color: #6c757d;
    text-align: center;
  }
  .footer a {
    color: #667eea;
  }
  .highlight-box {
    background: #f8f9fa;
    border-left: 4px solid #667eea;
    padding: 16px;
    margin: 16px 0;
    border-radius: 0 4px 4px 0;
  }
  .feature-list {
    list-style: none;
    padding: 0;
  }
  .feature-list li {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }
  .feature-list li:last-child {
    border-bottom: none;
  }
  .feature-list li::before {
    content: "✓";
    color: #28a745;
    font-weight: bold;
    margin-right: 10px;
  }
`;
