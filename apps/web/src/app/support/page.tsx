// Page Support publique — URL de support déclarée sur l'App Store et Google
// Play (obligatoire), accessible sans compte. Statique : aucune donnée lue.
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { LEGAL, PRIVACY_PATH } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Support — THRIVE',
  description: `Aide, questions fréquentes et contact du support THRIVE. Réponse sous ${LEGAL.responseDelay}.`,
};

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Qu’est-ce que THRIVE ?',
    a: (
      <p>
        THRIVE est un programme de développement de l’enfant par le sport, pour les jeunes de 8 à 17
        ans et leurs parents : séances avec un coach, bilans de progression et, dans l’espace
        Maison, de courts moments sportifs à vivre en famille.
      </p>
    ),
  },
  {
    q: 'Combien coûte l’abonnement ? Y a-t-il un essai gratuit ?',
    a: (
      <p>
        L’espace Maison est proposé à <strong>32,50 $ CA par mois</strong> ou{' '}
        <strong>299 $ CA par an</strong>, taxes incluses. Un essai gratuit d’un mois est offert une
        seule fois par compte. L’abonnement se renouvelle automatiquement jusqu’à son annulation ;
        vous pouvez annuler à tout moment pendant l’essai sans être facturé.
      </p>
    ),
  },
  {
    q: 'Puis-je utiliser mon abonnement sur l’ordinateur et sur mon téléphone ?',
    a: (
      <p>
        Oui. L’abonnement est lié à votre compte THRIVE : connectez-vous avec la même adresse
        courriel, sur le web comme dans l’app, et votre accès est reconnu partout.
      </p>
    ),
  },
  {
    q: 'Comment annuler mon abonnement ?',
    a: (
      <>
        <p>L’annulation dépend de l’endroit où vous vous êtes abonné :</p>
        <ul>
          <li>
            <strong>Sur le web</strong> : Compte › Abonnement › « Gérer mon abonnement », puis
            Annuler.
          </li>
          <li>
            <strong>iPhone / iPad</strong> : Réglages › [votre nom] › Abonnements › THRIVE ›
            Annuler l’abonnement.
          </li>
          <li>
            <strong>Android</strong> : Google Play › Profil › Paiements et abonnements ›
            Abonnements › THRIVE › Annuler.
          </li>
        </ul>
        <p>Vous gardez l’accès jusqu’à la fin de la période déjà payée.</p>
      </>
    ),
  },
  {
    q: 'Comment obtenir un remboursement ?',
    a: (
      <>
        <ul>
          <li>
            <strong>Abonnement pris sur le web</strong> : écrivez-nous à{' '}
            <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> ; nous traitons la
            demande nous-mêmes.
          </li>
          <li>
            <strong>Abonnement App Store</strong> : seul Apple peut rembourser. Rendez-vous sur{' '}
            <a href="https://reportaproblem.apple.com" rel="noopener noreferrer">
              reportaproblem.apple.com
            </a>
            .
          </li>
          <li>
            <strong>Abonnement Google Play</strong> : faites la demande depuis Google Play, ou
            écrivez-nous et nous la traiterons depuis notre console.
          </li>
        </ul>
      </>
    ),
  },
  {
    q: 'J’ai oublié mon mot de passe.',
    a: (
      <p>
        Sur la page de connexion, choisissez « Mot de passe oublié » et suivez le lien reçu par
        courriel (pensez à vérifier vos courriels indésirables). Pour votre sécurité, l’équipe
        THRIVE ne change jamais un mot de passe à votre place.
      </p>
    ),
  },
  {
    q: 'Je n’ai plus accès à l’adresse courriel de mon compte.',
    a: (
      <p>
        Écrivez-nous depuis votre nouvelle adresse. Pour protéger les données de votre famille,
        nous vérifierons votre identité avant toute modification.
      </p>
    ),
  },
  {
    q: 'Puis-je inscrire plusieurs enfants ?',
    a: <p>Oui : un compte parent peut regrouper plusieurs profils d’enfants.</p>,
  },
  {
    q: 'Quelles données recueillez-vous sur mon enfant, et qui les voit ?',
    a: (
      <p>
        Tout est détaillé dans notre <Link href={PRIVACY_PATH}>politique de confidentialité</Link>{' '}
        : quelles données, pourquoi, qui y a accès, où elles sont hébergées et combien de temps
        nous les gardons.
      </p>
    ),
  },
  {
    q: 'Comment obtenir une copie de mes données ou supprimer mon compte ?',
    a: (
      <p>
        Écrivez-nous depuis l’adresse courriel de votre compte, ou dans l’app via Messages ›
        Support. Nous répondons sous {LEGAL.rightsDelayDays} jours au plus. Si vous êtes abonné via
        l’App Store ou Google Play, annulez d’abord l’abonnement depuis votre téléphone : nous ne
        pouvons pas le faire à votre place.
      </p>
    ),
  },
  {
    q: 'THRIVE remplace-t-il un professionnel de la santé ?',
    a: (
      <p>
        Non. THRIVE est un programme éducatif. Si vous êtes inquiet pour la santé physique ou
        mentale de votre enfant, consultez un professionnel. En cas d’urgence, composez le 911 ;
        au Québec, Info-Social répond 24 h sur 24 au 811 (option 2).
      </p>
    ),
  },
];

export default function SupportPage() {
  return (
    <LegalPage
      title="Support THRIVE"
      intro={
        <p>
          Une question, un problème de connexion ou d’abonnement ? Nous répondons à chaque
          message <strong>sous {LEGAL.responseDelay}</strong> (du lundi au vendredi, jours fériés
          du Québec exclus), et plus vite si l’accès de votre famille est bloqué.
        </p>
      }
    >
      <Section id="contact" title="Nous joindre">
        <ul>
          <li>
            <strong>Par courriel</strong> :{' '}
            <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
          </li>
          <li>
            <strong>Dans l’app</strong> : Messages › Support THRIVE (une fois connecté).
          </li>
          <li>
            <strong>Protection des renseignements personnels</strong> :{' '}
            <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
          </li>
        </ul>
        <p>
          Pour un problème technique, indiquez-nous votre appareil (iPhone, Android, ordinateur),
          la version de l’app ou le navigateur, l’écran concerné et ce que vous faisiez juste
          avant. Une capture d’écran aide beaucoup.
        </p>
      </Section>

      <Section id="faq" title="Questions fréquentes">
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl bg-white/70 px-5 py-4 shadow-card open:bg-white"
            >
              <summary className="cursor-pointer list-none font-semibold text-navy-900 flex items-start justify-between gap-4 min-h-[28px]">
                <span>{q}</span>
                <span aria-hidden className="text-navy-600 transition-transform group-open:rotate-45 text-xl leading-none">
                  +
                </span>
              </summary>
              <div className="mt-3 space-y-3">{a}</div>
            </details>
          ))}
        </div>
      </Section>
    </LegalPage>
  );
}
