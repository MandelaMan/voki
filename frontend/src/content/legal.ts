export const LEGAL_UPDATED = 'October 12, 2026';
export const LEGAL_CONTACT = 'https://github.com/MandelaMan/voki';

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export const privacyPolicy: LegalSection[] = [
  {
    id: 'who',
    title: 'Who this policy covers',
    blocks: [
      {
        type: 'p',
        text: 'Voki is an inventory and sales app for small retail businesses. This policy explains what the app stores when you create an account and when you record stock, purchases, and sales.',
      },
      {
        type: 'p',
        text: 'If you enter details about your customers, suppliers, or staff, you are responsible for having a proper reason to keep that information and for telling those people how you use it.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account information',
    blocks: [
      {
        type: 'p',
        text: 'When you register or update your profile, we store:',
      },
      {
        type: 'list',
        items: [
          'Your first name, last name, and email address',
          'An optional phone number',
          'Your password, stored only as a hash, never as plain text',
          'Your theme preference (light, dark, or match the device)',
          'An optional profile photo, if you add one',
        ],
      },
      {
        type: 'p',
        text: 'We also keep the time your account was created, short-lived sign-in tokens, and a record of actions such as registering, signing in, and creating products, purchases, or sales.',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business records you enter',
    blocks: [
      {
        type: 'p',
        text: 'Everything you type into a business stays with that business. That can include:',
      },
      {
        type: 'list',
        items: [
          'Business name, description, logo, currency, and low-stock threshold',
          'Categories, products, variants, prices, stock levels, barcodes, and product photos',
          'Suppliers, including name, phone, email, address, and notes',
          'Customers, including name, phone, email, and notes',
          'Purchases, receipt or invoice files, and purchase notes',
          'Sales, quantities, selling and buying prices, profit, notes, and the payment method you select (cash, card, M-Pesa, bank transfer, or other)',
          'In-app alerts such as low stock and out of stock',
        ],
      },
      {
        type: 'p',
        text: 'Voki records the payment method you choose. It does not take card numbers, M-Pesa PINs, or process payments.',
      },
    ],
  },
  {
    id: 'device',
    title: 'What stays on your device',
    blocks: [
      {
        type: 'p',
        text: 'The app keeps a few things in your browser so you can stay signed in and keep working:',
      },
      {
        type: 'list',
        items: [
          'Access and refresh tokens, so you do not have to sign in on every screen',
          'Your theme choice',
          'A local queue of sales made while you are offline, until they sync',
          'A cache of product data and product images, through the installed app’s service worker',
        ],
      },
      {
        type: 'p',
        text: 'Signing out removes the tokens from that device. Clearing the site data in your browser removes the offline queue and cached files on that device. We do not use advertising cookies or third-party analytics.',
      },
    ],
  },
  {
    id: 'use',
    title: 'How we use this information',
    blocks: [
      {
        type: 'p',
        text: 'We use it to run the service: to create your account, sign you in, show your inventory, calculate stock and profit, generate reports, send in-app stock alerts, reset a forgotten password, and protect the service from misuse.',
      },
      {
        type: 'p',
        text: 'We do not sell your information, and we do not use your sales or customer lists for advertising.',
      },
    ],
  },
  {
    id: 'sharing',
    title: 'Who else can see it',
    blocks: [
      {
        type: 'p',
        text: 'Your business records are available to the account that created them. We share information only in these cases:',
      },
      {
        type: 'list',
        items: [
          'With the hosting providers that store the app, the database, and files you upload, so the service can run',
          'With Google, when your browser loads the Inter font from Google Fonts',
          'When the law requires us to disclose it, or when it is needed to investigate abuse of the service',
        ],
      },
    ],
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    blocks: [
      {
        type: 'p',
        text: 'We keep your account and business records while the account is in use. Products, sales, purchases, and similar records that you delete are marked deleted and may remain in the database and in backups for a period of time.',
      },
      {
        type: 'p',
        text: 'Password reset tokens are kept only until they expire or you set a new password. Refresh tokens expire on their own.',
      },
    ],
  },
  {
    id: 'choices',
    title: 'Your choices',
    blocks: [
      {
        type: 'p',
        text: 'You can change your name and phone number on the Profile screen. Your email is the sign-in address for the account. You can sign out on any device you use.',
      },
      {
        type: 'p',
        text: 'You can ask for a copy of your account data, a correction, or deletion of the account. The app does not yet have a delete-account button, so send that request from the email on the account using the contact below. We may need to confirm it is you before we act.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    blocks: [
      {
        type: 'p',
        text: 'Passwords are hashed before they are stored. Sign-in uses access tokens and refresh tokens. You should keep your password private and sign out on shared devices. No method of storage or transmission is perfectly secure.',
      },
    ],
  },
  {
    id: 'children',
    title: 'Children',
    blocks: [
      {
        type: 'p',
        text: 'Voki is for people running a business. It is not directed at children, and we do not knowingly collect accounts from children.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    blocks: [
      {
        type: 'p',
        text: 'We may update this policy when the product changes. The date at the top of the page will change with it. Continued use of Voki after an update means you accept the revised policy.',
      },
    ],
  },
];

export const termsAndConditions: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    blocks: [
      {
        type: 'p',
        text: 'These terms are the agreement between you and the operator of Voki. By creating an account or using the app, you agree to these terms and to the Privacy Policy.',
      },
      {
        type: 'p',
        text: 'If you use Voki for a business, you confirm that you are allowed to bind that business to these terms.',
      },
    ],
  },
  {
    id: 'service',
    title: 'The service',
    blocks: [
      {
        type: 'p',
        text: 'Voki lets you record products, stock, purchases, sales, suppliers, customers, and simple reports. It is a record-keeping tool.',
      },
      {
        type: 'p',
        text: 'Voki is not a bank, a payment processor, an accountant, or a tax service. Figures for stock, revenue, and profit are calculated from the numbers you enter. You are responsible for checking them and for your own tax, licensing, and record-keeping duties.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Your account',
    blocks: [
      {
        type: 'list',
        items: [
          'Give a real name and an email address you can access',
          'Keep your password private and do not share the account',
          'Tell us if you believe someone else has signed in as you',
          'You are responsible for activity that happens under your account',
        ],
      },
      {
        type: 'p',
        text: 'One account can hold more than one business. Each business has its own inventory and sales history.',
      },
    ],
  },
  {
    id: 'content',
    title: 'Your content',
    blocks: [
      {
        type: 'p',
        text: 'You keep ownership of the business data, photos, and files you upload. You give us permission to store, display, and back up that content so the service can work, including syncing a sale that was saved on your device while you were offline.',
      },
      {
        type: 'p',
        text: 'You confirm that you have the right to upload product photos and to store supplier and customer contact details. Do not upload content that is unlawful, that you do not have rights to, or that belongs to someone else’s business.',
      },
    ],
  },
  {
    id: 'use',
    title: 'Acceptable use',
    blocks: [
      {
        type: 'p',
        text: 'You agree not to:',
      },
      {
        type: 'list',
        items: [
          'Try to access another person’s account or business',
          'Probe, disrupt, or overload the service',
          'Use the app to store or share unlawful material',
          'Misrepresent sales, stock, or identity in a way that harms someone else',
        ],
      },
    ],
  },
  {
    id: 'availability',
    title: 'Availability and offline sales',
    blocks: [
      {
        type: 'p',
        text: 'We work to keep Voki available, but the service can be interrupted for maintenance, hosting problems, or a loss of connection. Features can change as the product improves.',
      },
      {
        type: 'p',
        text: 'A sale recorded while you are offline stays on your device until the app can sync it. Check that queued sales appear in your sales history after you are back online. We are not responsible for a sale that never left the device because the browser data was cleared or the device was lost.',
      },
    ],
  },
  {
    id: 'disclaimer',
    title: 'Disclaimer',
    blocks: [
      {
        type: 'p',
        text: 'The service is provided as it is and as it is available. We do not promise that stock counts, profit, reports, or alerts will be error-free. Decisions you make from those figures are yours.',
      },
      {
        type: 'p',
        text: 'To the extent the law allows, we are not liable for lost profits, lost data, or business losses that result from using or being unable to use Voki. Nothing in these terms limits liability that the law does not allow us to limit.',
      },
    ],
  },
  {
    id: 'ending',
    title: 'Stopping use',
    blocks: [
      {
        type: 'p',
        text: 'You can stop using Voki at any time by signing out. We may suspend or close an account if these terms are broken, if we need to protect the service or other people, or if we discontinue the product. Where we can, we will tell you before access ends.',
      },
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    blocks: [
      {
        type: 'p',
        text: 'We may update these terms. The date at the top of the page will change. If you keep using Voki after an update, you accept the revised terms. If you do not agree, stop using the service.',
      },
    ],
  },
];
