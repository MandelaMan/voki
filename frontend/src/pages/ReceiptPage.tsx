import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PremiumNotice } from '../components/billing/PremiumNotice';
import { usePremium } from '../stores';

/** Deep links to /sales/:id/receipt open the sales list with the print overlay. */
export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPremium = usePremium();

  useEffect(() => {
    if (!isPremium || !id) return;
    navigate('/sales', { replace: true, state: { printReceiptId: id } });
  }, [id, isPremium, navigate]);

  if (!isPremium) {
    return (
      <div className="page-stack">
        <PremiumNotice
          title="Receipts are on Premium"
          description="Print a receipt, or send it to the customer on WhatsApp."
        />
      </div>
    );
  }

  return null;
}
