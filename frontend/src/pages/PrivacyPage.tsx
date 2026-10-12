import { LegalDocument } from '../components/legal/LegalDocument';
import { privacyPolicy } from '../content/legal';

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lede="This policy describes the information Voki stores to run your inventory and sales records, and the choices you have about that information."
      sections={privacyPolicy}
      other={{ to: '/terms', label: 'Read the Terms and Conditions' }}
    />
  );
}
