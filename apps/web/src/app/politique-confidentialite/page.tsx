// Politique de confidentialité publique — URL déclarée aux stores et liée
// depuis l'inscription. Reflète ce que l'app traite réellement (tables
// Supabase, sous-traitants branchés) : toute nouvelle donnée ou tout nouveau
// fournisseur doit être ajouté ici AVANT sa mise en production, avec une
// nouvelle date dans LEGAL.privacyPolicyVersion.
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { LEGAL, SUPPORT_PATH, TERMS_PATH } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — THRIVE',
  description:
    'Comment Thrive Sport Positive recueille, utilise, conserve et protège les renseignements personnels des parents et des enfants.',
};

const PROCESSORS: { name: string; role: string; where: string }[] = [
  { name: 'Supabase', role: 'Base de données, comptes, fichiers et fonctions serveur', where: 'Canada (Montréal)' },
  { name: 'Vercel', role: 'Hébergement et diffusion de l’application web', where: 'États-Unis et réseau mondial' },
  { name: 'Stripe', role: 'Paiement des abonnements pris sur le web', where: 'Canada, États-Unis' },
  { name: 'Apple, Google', role: 'Paiement des abonnements pris dans l’app, notifications', where: 'États-Unis' },
  { name: 'RevenueCat', role: 'Suivi de l’état des abonnements (tous canaux)', where: 'États-Unis' },
  { name: 'Wistia', role: 'Diffusion des vidéos des séances', where: 'États-Unis' },
  { name: 'Expo', role: 'Acheminement des notifications de l’app mobile', where: 'États-Unis' },
  { name: 'Sentry', role: 'Diagnostic des erreurs techniques (sans enregistrement d’écran)', where: 'États-Unis' },
];

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updated={LEGAL.privacyPolicyVersion}
      intro={
        <p>
          THRIVE accompagne des enfants et des adolescents. Nous traitons leurs renseignements
          avec le plus grand soin, en respectant la <em>Loi sur la protection des renseignements
          personnels dans le secteur privé</em> du Québec (Loi 25) et, lorsqu’elles s’appliquent,
          la LPRPDE fédérale et le RGPD européen. Cette page explique, en termes simples, ce que
          nous recueillons, pourquoi, qui y a accès et quels sont vos droits.
        </p>
      }
    >
      <Section id="responsable" title="1. Qui est responsable de vos renseignements ?">
        <p>
          <strong>{LEGAL.company}</strong> exploite l’application THRIVE.
          NEQ : {LEGAL.neq}. Adresse du siège : {LEGAL.address}.
        </p>
        <p>
          Conformément à l’article 3.1 de la Loi 25, la personne responsable de la protection des
          renseignements personnels est <strong>{LEGAL.privacyOfficerName}</strong>.
          Titre : {LEGAL.privacyOfficerTitle}. Cette personne exerce la plus haute autorité au sein
          de l’entreprise. Pour toute question, demande ou plainte :{' '}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
        </p>
      </Section>

      <Section id="renseignements" title="2. Quels renseignements recueillons-nous ?">
        <p><strong>Sur le parent (titulaire du compte)</strong></p>
        <ul>
          <li>Nom, prénom, adresse courriel, mot de passe (conservé uniquement sous forme chiffrée irréversible) ;</li>
          <li>si vous les fournissez : téléphone, adresse postale, personne à joindre en cas d’urgence ;</li>
          <li>vos messages au coach ou au support, et les pièces jointes que vous envoyez.</li>
        </ul>
        <p><strong>Sur l’enfant</strong></p>
        <ul>
          <li>Prénom, nom, surnom, date de naissance, genre, sport pratiqué, numéro de maillot, avatar ;</li>
          <li>
            son parcours dans le programme : présence aux séances, réponses aux questionnaires
            psychoéducatifs, bilans et indicateurs de progression, notes du coach ;
          </li>
          <li>
            dans l’espace Maison : moments réalisés (activité, durée, lieu, ressenti, phrase
            retenue, note), photos si vous choisissez d’en ajouter, lettres parent-enfant.
          </li>
        </ul>
        <p>
          Les réponses aux questionnaires et les bilans sont des renseignements{' '}
          <strong>sensibles</strong> : ils ne servent qu’à l’accompagnement de votre enfant et ne
          sont jamais vendus, loués ni utilisés à des fins publicitaires.
        </p>
        <p><strong>Abonnement</strong></p>
        <ul>
          <li>
            Formule choisie, statut, dates d’essai et de renouvellement. Les numéros de carte sont
            traités directement par Stripe, Apple ou Google : nous ne les voyons jamais.
          </li>
        </ul>
        <p><strong>Données techniques</strong></p>
        <ul>
          <li>
            Jeton de connexion (témoin <code>sb-access-token</code>, indispensable à la session),
            préférences d’affichage enregistrées sur votre appareil, jetons de notification si vous
            les activez ;
          </li>
          <li>
            journaux de sécurité (date de connexion, adresse IP, type de navigateur) et rapports
            d’erreur techniques, utilisés pour protéger les comptes et corriger les problèmes.
          </li>
        </ul>
        <p>
          Nous n’utilisons <strong>aucun témoin publicitaire</strong>, aucun outil de profilage ni
          aucun identifiant publicitaire de votre appareil.
        </p>
      </Section>

      <Section id="finalites" title="3. Pourquoi les utilisons-nous ?">
        <ul>
          <li>créer et sécuriser votre compte ;</li>
          <li>offrir le programme : séances, suivi par le coach, bilans, espace Maison ;</li>
          <li>permettre les échanges entre votre famille, le coach et le support ;</li>
          <li>gérer votre abonnement et vos paiements ;</li>
          <li>vous envoyer les notifications que vous avez activées ;</li>
          <li>assurer la sécurité du service, détecter les abus et corriger les erreurs ;</li>
          <li>respecter nos obligations légales (comptabilité, fiscalité, incidents de confidentialité).</li>
        </ul>
        <p>Nous n’utilisons vos renseignements à aucune autre fin sans votre consentement.</p>
      </Section>

      <Section id="consentement" title="4. Consentement et mineurs">
        <p>
          Le compte est créé et géré par un parent ou un tuteur. Pour un enfant de moins de 14 ans,
          c’est le titulaire de l’autorité parentale qui consent à la collecte de ses
          renseignements (art. 4.1 de la Loi 25). Un jeune de 14 ans ou plus peut exercer
          lui-même ses droits en nous écrivant.
        </p>
        <p>
          Vous pouvez retirer votre consentement à tout moment ; certaines fonctions (le suivi par
          le coach, par exemple) ne pourront alors plus être offertes.
        </p>
      </Section>

      <Section id="acces" title="5. Qui a accès à vos renseignements ?">
        <ul>
          <li>
            <strong>Le coach assigné à votre enfant</strong> : profil de l’enfant, séances,
            questionnaires, bilans et messages échangés avec vous.
          </li>
          <li>
            <strong>L’équipe THRIVE</strong> (support et supervision clinique), uniquement lorsque
            c’est nécessaire : traitement de vos demandes, qualité et sécurité de
            l’accompagnement. Pour protéger les enfants, l’équipe de supervision peut consulter
            les échanges entre le coach et la famille ; elle n’y écrit jamais à la place du coach.
          </li>
          <li>
            <strong>Nos fournisseurs</strong> (section 6), dans la stricte mesure nécessaire à leur
            service et sous engagement contractuel de confidentialité.
          </li>
          <li>
            <strong>Les autorités</strong>, seulement lorsque la loi l’exige.
          </li>
        </ul>
      </Section>

      <Section id="fournisseurs" title="6. Fournisseurs et hébergement hors du Québec">
        <p>
          Nos données principales (comptes, profils, suivi, messages, fichiers) sont hébergées{' '}
          <strong>au Canada, à Montréal</strong>. Certains fournisseurs traitent une partie des
          renseignements à l’extérieur du Québec :
        </p>
        <div className="overflow-x-auto rounded-2xl bg-white/70 shadow-card">
          <table className="w-full text-left text-[15px]">
            <thead className="text-navy-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Fournisseur</th>
                <th scope="col" className="px-4 py-3 font-semibold">Rôle</th>
                <th scope="col" className="px-4 py-3 font-semibold">Lieu</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map((p) => (
                <tr key={p.name} className="border-t border-navy-900/10 align-top">
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3">{p.role}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Avant de communiquer des renseignements à l’extérieur du Québec, nous évaluons les
          facteurs relatifs à la vie privée (art. 17 de la Loi 25) et nous nous assurons, par
          contrat, d’une protection adéquate. Ces renseignements peuvent être soumis aux lois du
          pays où ils sont traités.
        </p>
      </Section>

      <Section id="conservation" title="7. Combien de temps les gardons-nous ?">
        <ul>
          <li>tant que votre compte est actif ;</li>
          <li>
            après une demande de suppression : effacement sous {LEGAL.rightsDelayDays} jours ; les
            copies de sauvegarde sont écrasées automatiquement dans les 30 jours suivants ;
          </li>
          <li>
            les factures et pièces comptables sont conservées 6 ans, comme l’exigent les lois
            fiscales.
          </li>
        </ul>
      </Section>

      <Section id="securite" title="8. Comment les protégeons-nous ?">
        <ul>
          <li>chiffrement de toutes les communications (HTTPS) ;</li>
          <li>
            règles d’accès appliquées par la base de données elle-même : chaque famille ne voit que
            ses propres données ;
          </li>
          <li>fichiers privés, accessibles seulement par lien temporaire ;</li>
          <li>accès de l’équipe limité au nécessaire, avec double authentification pour les administrateurs ;</li>
          <li>surveillance des erreurs et des incidents.</li>
        </ul>
        <p>
          En cas d’incident de confidentialité présentant un risque de préjudice sérieux, nous
          avisons sans délai la Commission d’accès à l’information et les personnes concernées.
        </p>
      </Section>

      <Section id="droits" title="9. Vos droits">
        <p>Vous pouvez, pour vous et pour votre enfant mineur :</p>
        <ul>
          <li>accéder à vos renseignements et en obtenir une copie ;</li>
          <li>les recevoir dans un format technologique structuré et couramment utilisé (portabilité) ;</li>
          <li>les faire rectifier s’ils sont inexacts, incomplets ou équivoques ;</li>
          <li>retirer votre consentement ;</li>
          <li>demander la suppression de votre compte et de vos renseignements ;</li>
          <li>demander la cessation de la diffusion ou la désindexation d’un renseignement.</li>
        </ul>
        <p>
          Écrivez à <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> depuis
          l’adresse de votre compte. Nous répondons dans un délai de {LEGAL.rightsDelayDays} jours.
          Si notre réponse ne vous satisfait pas, vous pouvez porter plainte à la{' '}
          <a href="https://www.cai.gouv.qc.ca" rel="noopener noreferrer">
            Commission d’accès à l’information du Québec
          </a>
          .
        </p>
      </Section>

      <Section id="suppression" title="10. Supprimer votre compte et vos renseignements">
        <p>
          <strong>Depuis l’app :</strong> Profil › Confidentialité et compte › « Supprimer mon compte et mes données ». Vos
          renseignements sont effacés dans un délai de{' '}
          {LEGAL.rightsDelayDays} jours ; les copies de sauvegarde sont écrasées automatiquement dans
          les 30 jours suivants.
        </p>
        <p>
          <strong>Sans accès à l’app :</strong> écrivez à{' '}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> depuis l’adresse de votre
          compte, avec la mention « Suppression de compte ». Nous pouvons vous demander une confirmation
          d’identité avant de traiter la demande.
        </p>
        <p>
          <strong>Ce qui est supprimé :</strong> votre compte, les renseignements de vos enfants
          rattachés à votre famille, leurs bilans, leurs réponses aux questionnaires, vos messages et
          vos fichiers.
        </p>
        <p>
          <strong>Ce qui peut être conservé :</strong> les factures et pièces comptables (6 ans, lois
          fiscales) et, le cas échéant, une trace minimale de la demande pour démontrer son traitement.
          Un abonnement Apple ou Google Play doit être annulé dans les réglages de votre appareil : sa
          suppression dans l’app n’annule pas l’abonnement.
        </p>
        <p>
          Conditions d’utilisation : <Link href={TERMS_PATH}>{TERMS_PATH}</Link>.
        </p>
      </Section>

      <Section id="modifications" title="11. Modifications">
        <p>
          Nous pouvons mettre à jour cette politique. La date en haut de page indique la dernière
          version ; en cas de changement important, nous vous en informerons dans l’app ou par
          courriel avant son entrée en vigueur.
        </p>
        <p>
          Une question ? Consultez la page <Link href={SUPPORT_PATH}>Support</Link> ou écrivez-nous.
        </p>
      </Section>
    </LegalPage>
  );
}
