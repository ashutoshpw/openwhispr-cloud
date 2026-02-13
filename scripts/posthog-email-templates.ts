import { baseStyles } from "./posthog-email-styles";
import type { EmailTemplate } from "./posthog-workflow-types";

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{app_name}}!",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{app_name}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>Thanks for joining us! We're thrilled to have you as part of our community.</p>
      
      <p>Your account has been created with the email: <strong>{{person.properties.email}}</strong></p>
      
      <div class="highlight-box">
        <strong>Quick Start:</strong>
        <p style="margin-bottom:0">Head to your dashboard to explore all the features available to you.</p>
      </div>
      
      <center>
        <a href="{{app_url}}/dashboard" class="button">Go to Dashboard</a>
      </center>
      
      <p>Need help getting started? Check out our <a href="{{app_url}}/docs">documentation</a> or reply to this email.</p>
      
      <p>Best regards,<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p>You're receiving this because you signed up at <a href="{{app_url}}">{{app_url}}</a></p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Welcome to {{app_name}}!

Hi {{person.properties.name}},

Thanks for joining us! We're thrilled to have you as part of our community.

Your account has been created with the email: {{person.properties.email}}

Get started by visiting your dashboard: {{app_url}}/dashboard

Need help? Check out our documentation at {{app_url}}/docs or reply to this email.

Best regards,
The {{app_name}} Team`,
  },
  {
    id: "getting-started",
    name: "Getting Started Guide",
    subject: "Get started with {{app_name}} in 3 easy steps",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Getting Started</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>Ready to make the most of {{app_name}}? Here's how to get started in just 3 steps:</p>
      
      <ol>
        <li><strong>Complete your profile</strong><br>
        Add your details to personalize your experience.</li>
        
        <li><strong>Explore the dashboard</strong><br>
        Familiarize yourself with the main features and navigation.</li>
        
        <li><strong>Try a key feature</strong><br>
        Pick one feature and give it a try - you'll be amazed at what you can do!</li>
      </ol>
      
      <center>
        <a href="{{app_url}}/dashboard" class="button">Start Exploring</a>
      </center>
      
      <p>Have questions? Our support team is always here to help.</p>
      
      <p>Best,<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p><a href="{{app_url}}/unsubscribe">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Getting Started with {{app_name}}

Hi {{person.properties.name}},

Ready to make the most of {{app_name}}? Here's how to get started in just 3 steps:

1. Complete your profile
   Add your details to personalize your experience.

2. Explore the dashboard
   Familiarize yourself with the main features and navigation.

3. Try a key feature
   Pick one feature and give it a try - you'll be amazed at what you can do!

Start exploring: {{app_url}}/dashboard

Have questions? Our support team is always here to help.

Best,
The {{app_name}} Team`,
  },
  {
    id: "tips-and-tricks",
    name: "Tips and Tricks",
    subject: "Pro tips to get the most out of {{app_name}}",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pro Tips & Tricks</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>Now that you've had some time to explore, here are some pro tips our power users love:</p>
      
      <ul class="feature-list">
        <li>Use keyboard shortcuts to navigate faster</li>
        <li>Set up notifications to stay on top of important updates</li>
        <li>Customize your dashboard layout for your workflow</li>
        <li>Connect integrations to streamline your process</li>
        <li>Check out our templates to get started quickly</li>
      </ul>
      
      <div class="highlight-box">
        <strong>Pro tip:</strong> Bookmark your most-used pages for quick access!
      </div>
      
      <center>
        <a href="{{app_url}}/docs/tips" class="button">View All Tips</a>
      </center>
      
      <p>Questions or feedback? We'd love to hear from you - just reply to this email.</p>
      
      <p>Happy building!<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p><a href="{{app_url}}/unsubscribe">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Pro Tips & Tricks for {{app_name}}

Hi {{person.properties.name}},

Now that you've had some time to explore, here are some pro tips our power users love:

- Use keyboard shortcuts to navigate faster
- Set up notifications to stay on top of important updates
- Customize your dashboard layout for your workflow
- Connect integrations to streamline your process
- Check out our templates to get started quickly

Pro tip: Bookmark your most-used pages for quick access!

View all tips: {{app_url}}/docs/tips

Questions or feedback? We'd love to hear from you - just reply to this email.

Happy building!
The {{app_name}} Team`,
  },
  {
    id: "trial-welcome",
    name: "Trial Welcome",
    subject: "Your trial has started - here's what you can do",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Trial Has Started!</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>Great news! Your trial of <strong>{{properties.plan_name}}</strong> is now active.</p>
      
      <div class="highlight-box">
        <strong>Trial Details:</strong>
        <p style="margin-bottom:0">Duration: {{properties.trial_duration_days}} days<br>
        Expires: {{properties.trial_end_date}}</p>
      </div>
      
      <p>During your trial, you'll have access to:</p>
      
      <ul class="feature-list">
        <li>All premium features</li>
        <li>Priority support</li>
        <li>Advanced analytics</li>
        <li>Unlimited usage</li>
      </ul>
      
      <center>
        <a href="{{app_url}}/dashboard" class="button">Start Using Premium Features</a>
      </center>
      
      <p>Make the most of your trial - we're here if you have any questions!</p>
      
      <p>Best,<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p><a href="{{app_url}}/unsubscribe">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Your Trial Has Started!

Hi {{person.properties.name}},

Great news! Your trial of {{properties.plan_name}} is now active.

Trial Details:
- Duration: {{properties.trial_duration_days}} days
- Expires: {{properties.trial_end_date}}

During your trial, you'll have access to:
- All premium features
- Priority support
- Advanced analytics
- Unlimited usage

Start using premium features: {{app_url}}/dashboard

Make the most of your trial - we're here if you have any questions!

Best,
The {{app_name}} Team`,
  },
  {
    id: "feature-highlights",
    name: "Feature Highlights",
    subject: "Discover powerful features you might have missed",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Feature Highlights</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>You're a few days into your trial - here are some powerful features you might not have discovered yet:</p>
      
      <h3 style="color: #667eea; margin-top: 24px;">Advanced Analytics</h3>
      <p>Get deep insights into your data with our comprehensive analytics dashboard.</p>
      
      <h3 style="color: #667eea;">Team Collaboration</h3>
      <p>Invite team members and work together seamlessly with real-time updates.</p>
      
      <h3 style="color: #667eea;">Integrations</h3>
      <p>Connect with your favorite tools and automate your workflow.</p>
      
      <h3 style="color: #667eea;">API Access</h3>
      <p>Build custom solutions with our powerful REST API.</p>
      
      <center>
        <a href="{{app_url}}/features" class="button">Explore All Features</a>
      </center>
      
      <p>Need a walkthrough? Reply to this email and we'll set up a quick demo call.</p>
      
      <p>Best,<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p><a href="{{app_url}}/unsubscribe">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Feature Highlights

Hi {{person.properties.name}},

You're a few days into your trial - here are some powerful features you might not have discovered yet:

ADVANCED ANALYTICS
Get deep insights into your data with our comprehensive analytics dashboard.

TEAM COLLABORATION
Invite team members and work together seamlessly with real-time updates.

INTEGRATIONS
Connect with your favorite tools and automate your workflow.

API ACCESS
Build custom solutions with our powerful REST API.

Explore all features: {{app_url}}/features

Need a walkthrough? Reply to this email and we'll set up a quick demo call.

Best,
The {{app_name}} Team`,
  },
  {
    id: "trial-ending-soon",
    name: "Trial Ending Soon",
    subject: "Your trial ends soon - don't lose access",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}
    .cta-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 8px;
      text-align: center;
      margin: 24px 0;
    }
    .cta-box h3 {
      margin: 0 0 8px;
      color: white;
    }
    .cta-box p {
      margin: 0 0 16px;
      opacity: 0.9;
    }
    .cta-box .button {
      background: white;
      color: #667eea !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Trial Ends Soon</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>Your trial is coming to an end. We hope you've had a chance to explore all the features {{app_name}} has to offer.</p>
      
      <div class="cta-box">
        <h3>Don't Lose Access!</h3>
        <p>Upgrade now to keep all your premium features.</p>
        <a href="{{app_url}}/pricing" class="button">View Plans & Pricing</a>
      </div>
      
      <p>Here's what you'll keep with a subscription:</p>
      
      <ul class="feature-list">
        <li>All premium features you've been using</li>
        <li>Your saved data and configurations</li>
        <li>Priority customer support</li>
        <li>Regular feature updates</li>
      </ul>
      
      <p>Have questions about which plan is right for you? Reply to this email and we'll help you decide.</p>
      
      <p>Best,<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p><a href="{{app_url}}/unsubscribe">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Your Trial Ends Soon

Hi {{person.properties.name}},

Your trial is coming to an end. We hope you've had a chance to explore all the features {{app_name}} has to offer.

DON'T LOSE ACCESS!
Upgrade now to keep all your premium features.

View plans & pricing: {{app_url}}/pricing

Here's what you'll keep with a subscription:
- All premium features you've been using
- Your saved data and configurations
- Priority customer support
- Regular feature updates

Have questions about which plan is right for you? Reply to this email and we'll help you decide.

Best,
The {{app_name}} Team`,
  },
  {
    id: "pricing-followup",
    name: "Pricing Follow-up",
    subject: "Questions about our pricing? We're here to help",
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Need Help Choosing?</h1>
    </div>
    <div class="content">
      <p>Hi {{person.properties.name}},</p>
      
      <p>I noticed you were checking out our pricing page. If you have any questions about which plan is right for you, I'm here to help!</p>
      
      <p>Here's a quick overview:</p>
      
      <div class="highlight-box">
        <strong>Not sure which plan to choose?</strong>
        <p style="margin-bottom:0">Most of our users start with the middle tier - it has the best balance of features and value.</p>
      </div>
      
      <p>A few things that might help:</p>
      
      <ul>
        <li>All plans come with a free trial - no credit card required</li>
        <li>You can upgrade or downgrade anytime</li>
        <li>We offer annual discounts of up to 20%</li>
        <li>Enterprise plans include custom pricing and dedicated support</li>
      </ul>
      
      <center>
        <a href="{{app_url}}/pricing" class="button">Compare Plans</a>
      </center>
      
      <p>Just reply to this email if you'd like to chat about your specific needs.</p>
      
      <p>Best,<br>The {{app_name}} Team</p>
    </div>
    <div class="footer">
      <p>&copy; {{current_year}} {{app_name}}. All rights reserved.</p>
      <p><a href="{{app_url}}/unsubscribe">Unsubscribe</a> from these emails</p>
    </div>
  </div>
</body>
</html>`,
    textContent: `Need Help Choosing a Plan?

Hi {{person.properties.name}},

I noticed you were checking out our pricing page. If you have any questions about which plan is right for you, I'm here to help!

Not sure which plan to choose?
Most of our users start with the middle tier - it has the best balance of features and value.

A few things that might help:
- All plans come with a free trial - no credit card required
- You can upgrade or downgrade anytime
- We offer annual discounts of up to 20%
- Enterprise plans include custom pricing and dedicated support

Compare plans: {{app_url}}/pricing

Just reply to this email if you'd like to chat about your specific needs.

Best,
The {{app_name}} Team`,
  },
];

export function getEmailTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((template) => template.id === id);
}

export function getEmailTemplateIds(): string[] {
  return EMAIL_TEMPLATES.map((template) => template.id);
}
