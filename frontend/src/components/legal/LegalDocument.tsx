import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { VokiMark } from '../brand/VokiMark';
import { ThemeToggle } from '../layout/ThemeToggle';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { LEGAL_CONTACT, LEGAL_UPDATED, type LegalSection } from '../../content/legal';
import { useAuthStore } from '../../stores';

export function LegalDocument({
  title,
  lede,
  sections,
  other,
}: {
  title: string;
  lede: string;
  sections: LegalSection[];
  other: { to: string; label: string };
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const article = (
    <div className="page-stack">
      <PageHeader title={title} subtitle={`Last updated ${LEGAL_UPDATED}`} />
      <Card className="!p-5 sm:!p-6">
        <article className="space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>{lede}</p>
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="space-y-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{section.title}</h2>
              {section.blocks.map((block, index) =>
                block.type === 'p' ? (
                  <p key={index}>{block.text}</p>
                ) : (
                  <ul key={index} className="list-disc space-y-1.5 pl-5">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )
              )}
            </section>
          ))}
          <section className="space-y-2 border-t border-slate-100 pt-5 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Contact</h2>
            <p>
              Questions about this page, and requests to access, correct, or delete your account, can be sent through the Voki project:{' '}
              <a
                href={LEGAL_CONTACT}
                className="font-semibold text-primary-600 hover:underline dark:text-primary-300"
                target="_blank"
                rel="noreferrer"
              >
                {LEGAL_CONTACT.replace('https://', '')}
              </a>
              . Send account requests from the email address on your Voki account so we can confirm it is you.
            </p>
            <p>
              <Link to={other.to} className="font-semibold text-primary-600 hover:underline dark:text-primary-300">
                {other.label}
              </Link>
            </p>
          </section>
        </article>
      </Card>
    </div>
  );

  if (isAuthenticated) return article;

  return (
    <div className="min-h-svh bg-[#eef3f9] dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#eef3f9]/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
            <ArrowLeft size={16} />
            Sign in
          </Link>
          <div className="flex items-center gap-2">
            <VokiMark size={28} />
            <span className="text-sm font-bold text-slate-900 dark:text-white">Voki</span>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-6">{article}</main>
    </div>
  );
}
