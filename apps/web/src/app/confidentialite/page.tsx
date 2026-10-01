// Politique de confidentialité — page publique (lien depuis l'inscription,
// le compte et le menu). Elle décrit ce que l'app fait réellement : données
// collectées, accès, hébergement, droits du parent et comment les exercer.
// Version acceptée à l'inscription : PRIVACY_VERSION (lib/signup.ts).
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { PRIVACY_VERSION } from '@/lib/signup';

export const metadata = { title: 'THRIVE — Confidentialité' };

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Ce que nous recueillons',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Toi, le parent :</strong> prénom, nom, adresse email, et les messages échangés avec ton coach
          ou le support.
        </li>
        <li>
          <strong>Ton enfant :</strong> prénom, nom, âge (date de naissance), sport, photo de profil si tu en
          ajoutes une, et les informations utiles à son accompagnement (objectifs, observations et bilans du
          coach, réponses à ses questionnaires).
        </li>
        <li>
          <strong>L&apos;utilisation de l&apos;app :</strong> séances suivies, moments Maison réalisés et ce que
          tu choisis d&apos;y noter.
        </li>
      </ul>
    ),
  },
  {
    title: 'Pourquoi',
    body: (
      <p>
        Uniquement pour accompagner ton enfant dans le parcours THRIVE : préparer et suivre ses séances, mesurer
        sa progression, te la montrer et te permettre d&apos;échanger avec son coach. Nous ne vendons aucune
        donnée et ne faisons aucune publicité ciblée.
      </p>
    ),
  },
  {
    title: 'Qui y a accès',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Toi, et les autres parents ou tuteurs que tu ajoutes à ta famille.</li>
        <li>Le coach THRIVE attribué à ton enfant.</li>
        <li>L&apos;équipe THRIVE, pour l&apos;activation des comptes et le support.</li>
      </ul>
    ),
  },
  {
    title: 'Où et comment c’est protégé',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Les données sont hébergées au Canada (région de Montréal).</li>
        <li>
          Les droits d&apos;accès sont vérifiés par la base de données elle-même : une donnée à laquelle un
          compte n&apos;a pas droit ne quitte jamais le serveur.
        </li>
        <li>Documents et photos sont dans un stockage privé, ouverts par des liens temporaires.</li>
        <li>Ton enfant n&apos;a ni compte, ni profil public : il répond à ses questionnaires par un lien unique.</li>
      </ul>
    ),
  },
  {
    title: 'Tes droits',
    body: (
      <>
        <p>
          Tu peux à tout moment consulter les renseignements qui te concernent ou concernent ton enfant, les
          faire corriger, en obtenir une copie, retirer ton consentement ou demander leur suppression.
        </p>
        <p className="mt-2">
          Depuis l&apos;app : <strong>Paramètres du compte</strong> › « Télécharger mes données » ou « Supprimer
          mon compte ». Pour toute autre demande, écris au <strong>Support THRIVE</strong> depuis la messagerie.
        </p>
      </>
    ),
  },
];

export default function ConfidentialitePage() {
  return (
    <main className="min-h-dvh bg-cream px-5 py-10 md:py-16">
      <article className="max-w-2xl mx-auto">
        <Link href="/login" className="inline-flex items-center gap-3 mb-8 min-h-[44px]" aria-label="THRIVE — espace membres">
          <BrandLogo className="w-11 h-11" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-navy-700 font-bold">Sport Positive</span>
        </Link>
        <h1 className="font-display text-[34px] md:text-[42px] leading-[1.1] font-semibold text-navy-900 text-balance">
          Confidentialité
        </h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-navy-700 text-pretty">
          Tu nous confies des renseignements sur ton enfant. Voici, simplement, ce que nous en faisons — conformément
          à la Loi 25 du Québec.
        </p>

        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-display text-[22px] font-semibold text-navy-900 mb-2">{s.title}</h2>
              <div className="text-[15px] leading-[1.65] text-navy-800 text-pretty">{s.body}</div>
            </section>
          ))}
        </div>

        <p className="mt-12 pt-6 border-t border-navy-100 text-[13px] text-navy-700">Version {PRIVACY_VERSION}</p>
      </article>
    </main>
  );
}
