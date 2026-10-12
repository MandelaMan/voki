import { LegalDocument } from '../components/legal/LegalDocument';
import { termsAndConditions } from '../content/legal';

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      lede="These terms cover your use of Voki to record inventory, purchases, and sales for your business."
      sections={termsAndConditions}
      other={{ to: '/privacy', label: 'Read the Privacy Policy' }}
    />
  );
}
