import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc, List, Section } from '@/components/legal/LegalDoc';
import { LEGAL_ENTITY, PRIVACY_CONTACT } from '@/lib/legal-entity';
import { ACCOUNT_DELETION_PATH, PRIVACY_PATH } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation — THRIVE',
  description: 'Règles d’utilisation de THRIVE, de l’abonnement Maison et des parcours coachés.',
};

// Conditions d'utilisation — alignées sur le fonctionnement réel : essai de
// 30 jours une fois par compte (TRIAL_DAYS, billing_core.ts), carte demandée,
// renouvellement automatique, annulation au portail Stripe ou dans les
// réglages du téléphone, « 1 mois offert » du certificat Maison
// (claim-certificate-reward), comptes parent seulement, enfants de 8 à 17 ans.
// Tient lieu de contrat de licence (EULA) des applications iPhone et Android :
// URL à déclarer dans App Store Connect (« License Agreement ») et Google Play.

export default function CguPage() {
  const operator = LEGAL_ENTITY.legalName
    ? `${LEGAL_ENTITY.legalName}${LEGAL_ENTITY.neq ? ` (NEQ ${LEGAL_ENTITY.neq})` : ''}, qui exploite ${LEGAL_ENTITY.brand}`
    : LEGAL_ENTITY.brand;
  return (
    <LegalDoc
      title="Conditions d’utilisation"
      intro={
        <p>
          Ces conditions forment le contrat entre vous et <strong>{operator}</strong> (« THRIVE »,
          « nous »). Elles s’appliquent à l’application web ({LEGAL_ENTITY.appUrl.replace('https://', '')})
          et aux applications iPhone et Android THRIVE, dont elles constituent le contrat de licence.
          En créant un compte, vous les acceptez, ainsi que la{' '}
          <Link href={PRIVACY_PATH} className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          .
        </p>
      }
    >
      <Section id="editeur" title="1. Nous joindre">
        <p>
          {LEGAL_ENTITY.legalName ? <>{LEGAL_ENTITY.legalName}<br /></> : null}
          {LEGAL_ENTITY.address ? <>{LEGAL_ENTITY.address}<br /></> : null}
          Service client : la conversation « Support THRIVE » de la messagerie de l’app, ouverte à
          tous les parents, y compris avant l’activation du compte. Site :{' '}
          <a href={LEGAL_ENTITY.siteUrl} className="underline underline-offset-2">
            {LEGAL_ENTITY.siteUrl.replace('https://', '')}
          </a>
          .
        </p>
      </Section>

      <Section id="service" title="2. Le service">
        <p>
          THRIVE est un parcours <strong>psychoéducatif par le sport</strong> pour les jeunes de 8 à
          17 ans : des séances avec un coach THRIVE (parcours coachés de 13 séances), un Passeport
          athlète et des bilans pour le parent, des questionnaires reconnus (LSSS, EPOCH), et le
          programme <strong>Maison</strong> (« Le moment qui compte ») : une activité courte par
          jour à vivre en famille.
        </p>
        <p>
          THRIVE n’est <strong>pas</strong> un service de santé : il ne pose aucun diagnostic et ne
          remplace ni un médecin, ni un psychologue, ni un autre professionnel. Si votre enfant
          traverse une détresse, consultez un professionnel ; en cas d’urgence, composez le 911. Au
          Québec, Info-Social 811 répond jour et nuit. La fiche « Quand consulter » de l’app
          précise les signes à surveiller.
        </p>
      </Section>

      <Section id="compte" title="3. Votre compte">
        <List
          items={[
            'Le compte est réservé à une personne majeure, titulaire de l’autorité parentale (ou tuteur) de chaque enfant inscrit. Les enfants n’ont pas de compte : ils répondent à leurs questionnaires par un lien unique.',
            'Les renseignements fournis doivent être exacts ; l’âge de l’enfant doit être compris entre 8 et 17 ans.',
            'Vous gardez votre mot de passe confidentiel et nous avisez sans délai de toute utilisation non autorisée.',
            'Le titulaire peut inviter un second parent, dans la limite de son forfait ; un abonnement Maison inclut l’accès pour deux parents. Le second parent dispose de son propre compte et peut consulter et compléter les profils des enfants ; seul le titulaire modifie la famille et invite des membres.',
          ]}
        />
      </Section>

      <Section id="maison" title="4. Abonnement Maison">
        <List
          items={[
            <><strong>Prix</strong> : le prix, la périodicité (mensuelle ou annuelle) et les taxes applicables sont affichés avant tout paiement ; ils sont exprimés dans la devise indiquée à l’écran. Un reçu vous est remis par courriel après chaque paiement.</>,
            <><strong>Essai gratuit</strong> : un essai de 30 jours est offert une seule fois par compte. Une carte est demandée au départ. Sans annulation avant la fin de l’essai, le premier prélèvement a lieu le jour de sa fin ; la date est rappelée dans <strong>Mon abonnement</strong>.</>,
            <><strong>Renouvellement automatique</strong> : l’abonnement se renouvelle à chaque période jusqu’à son annulation.</>,
            <><strong>Annulation</strong> : à tout moment, en deux clics — sur le web dans <strong>Mon abonnement › Gérer mon abonnement</strong> ; sur iPhone dans Réglages › votre nom › Abonnements ; sur Android dans Google Play › Paiements et abonnements. L’accès reste ouvert jusqu’à la fin de la période payée ; la période en cours n’est pas remboursée, sauf si la loi applicable en dispose autrement.</>,
            <><strong>Achats sur iPhone ou Android</strong> : le paiement est débité sur votre compte Apple ou Google ; la facturation et les remboursements sont gérés par Apple ou Google selon leurs propres conditions.</>,
            <><strong>Changement de prix</strong> : toute hausse vous est annoncée au moins 30 jours avant son application ; vous pouvez alors annuler sans frais.</>,
            <><strong>Consommateurs de l’Union européenne</strong> : vous disposez d’un droit de rétractation de 14 jours à compter de la souscription. Si vous demandez à utiliser Maison pendant ce délai, un montant proportionnel au service déjà fourni peut être retenu en cas de rétractation.</>,
          ]}
        />
      </Section>

      <Section id="certificat" title="5. Certificat Maison : un mois offert">
        <p>
          La famille qui termine les 13 semaines du programme Maison reçoit le Certificat THRIVE
          Maison et <strong>un mois d’abonnement offert</strong>, une fois par famille :
        </p>
        <List
          items={[
            'abonnement payé sur le web : un crédit égal au prix d’un mois de la formule mensuelle est appliqué automatiquement sur la prochaine facture (pour une formule annuelle, il est déduit du prochain renouvellement) ;',
            'sans abonnement en cours : le crédit est réservé et s’applique automatiquement à votre prochaine souscription sur le web ;',
            'abonnement payé sur iPhone ou Android : Apple et Google ne permettent pas d’appliquer ce crédit à notre place ; notre équipe vous contacte pour vous remettre un code d’offre ou un mois équivalent.',
          ]}
        />
        <p>Le crédit n’a pas de valeur monétaire et n’est ni échangeable ni remboursable.</p>
      </Section>

      <Section id="coaches" title="6. Parcours coachés">
        <p>
          Les forfaits de parcours coachés (Essentiel, Avancé, Performance) sont convenus avec votre
          coach THRIVE ; le prix, le calendrier des séances et les modalités d’annulation ou de
          report figurent dans l’entente remise lors de l’inscription. La page « Les forfaits » de
          l’app décrit le contenu de chaque forfait. Votre coach confirme l’accès complet à
          l’espace parent après la première étape d’inscription.
        </p>
      </Section>

      <Section id="usage" title="7. Utilisation acceptable">
        <List
          items={[
            'Utiliser THRIVE pour l’accompagnement de vos propres enfants seulement.',
            'Rester respectueux dans la messagerie ; aucun contenu illégal, haineux, violent ou portant atteinte à la vie privée d’autrui.',
            'Ne pas tenter de contourner les accès, d’extraire massivement les contenus ni de perturber le service.',
            'Ne pas revendre, diffuser publiquement ou reproduire les contenus THRIVE (vidéos, fiches Maison, guides) en dehors d’un usage familial.',
          ]}
        />
        <p>
          Un manquement grave ou répété peut entraîner la suspension du compte, après avis lorsque
          c’est possible. Vous pouvez signaler un contenu ou un comportement inapproprié au support
          THRIVE depuis la messagerie.
        </p>
      </Section>

      <Section id="contenus" title="8. Contenus et licence">
        <p>
          Les contenus de THRIVE (méthode, vidéos, fiches, textes, marques) sont protégés. Nous vous
          accordons une licence personnelle, non exclusive, non transférable et révocable
          d’utilisation de l’application, pour un usage familial et non commercial, pendant votre
          accès. Les contenus que vous ajoutez (photos, carnet, messages) restent les vôtres ; vous
          nous autorisez à les conserver et à les afficher aux personnes autorisées de votre famille
          et de l’équipe THRIVE, uniquement pour rendre le service.
        </p>
      </Section>

      <Section id="apple" title="9. Applications iPhone et Android">
        <List
          items={[
            'Ce contrat est conclu entre vous et THRIVE uniquement, et non avec Apple Inc. ou Google LLC. THRIVE, et non Apple ou Google, est seul responsable de l’application et de son contenu.',
            'La licence porte sur l’utilisation de l’application sur les appareils Apple ou Android que vous possédez ou contrôlez, dans le respect des règles d’usage de l’App Store et de Google Play.',
            'Apple et Google n’ont aucune obligation de maintenance ni de support de l’application. Toute question, réclamation ou plainte (fonctionnement, conformité légale, protection du consommateur, propriété intellectuelle) nous est adressée.',
            'Si l’application ne respecte pas une garantie applicable, vous pouvez en aviser Apple, qui pourra vous rembourser le prix d’achat de l’application ; dans la mesure permise par la loi, Apple n’a aucune autre obligation de garantie.',
            'En cas de réclamation d’un tiers selon laquelle l’application porterait atteinte à ses droits de propriété intellectuelle, THRIVE, et non Apple, est responsable de l’enquête, de la défense, du règlement et de la décharge de cette réclamation.',
            'Vous déclarez ne pas résider dans un pays visé par un embargo du gouvernement des États-Unis et ne figurer sur aucune liste de parties interdites ou restreintes.',
            'Apple et ses filiales sont des tiers bénéficiaires de cette section : à votre acceptation, Apple aura le droit de la faire valoir contre vous.',
          ]}
        />
      </Section>

      <Section id="disponibilite" title="10. Disponibilité et responsabilité">
        <p>
          Nous faisons le nécessaire pour que THRIVE soit disponible et fiable, sans pouvoir
          garantir une absence totale d’interruption (maintenance, panne d’un prestataire). Nous
          répondons des dommages causés par notre faute, dans les limites permises par la loi ;
          aucune clause des présentes ne limite les droits que vous accorde la{' '}
          <em>Loi sur la protection du consommateur</em> du Québec ou la loi de votre pays de
          résidence.
        </p>
      </Section>

      <Section id="fin" title="11. Fin du contrat">
        <p>
          Vous pouvez supprimer votre compte à tout moment dans <strong>Compte › Supprimer mon
          compte</strong> (marche à suivre complète :{' '}
          <Link href={ACCOUNT_DELETION_PATH} className="underline underline-offset-2">
            supprimer votre compte
          </Link>
          ) ; le compte et les données de votre famille sont effacés au plus tard 30 jours après la
          demande, et l’abonnement web est arrêté. Pensez à annuler un abonnement pris sur iPhone ou
          Android depuis votre téléphone.
        </p>
      </Section>

      <Section id="modifications" title="12. Modifications">
        <p>
          Nous pouvons faire évoluer ces conditions. Toute modification importante vous est
          annoncée dans l’app et par courriel au moins 30 jours avant son entrée en vigueur ; vous
          pouvez alors refuser la modification en supprimant votre compte ou en annulant votre
          abonnement, sans frais.
        </p>
      </Section>

      <Section id="droit" title="13. Droit applicable et litiges">
        <p>
          Ces conditions sont régies par les lois du Québec et les lois du Canada qui s’y
          appliquent. Écrivez-nous d’abord : nous cherchons une solution amiable dans les 30 jours.
          À défaut, le litige relève des tribunaux du Québec, sans vous priver du droit de saisir
          le tribunal de votre domicile que vous accorde la loi. Les consommateurs de l’Union
          européenne peuvent aussi recourir gratuitement à un médiateur de la consommation.
        </p>
        <p>
          Questions sur vos renseignements personnels : {PRIVACY_CONTACT.channel}
          {PRIVACY_CONTACT.email ? <> ou {PRIVACY_CONTACT.email}</> : null} (voir la{' '}
          <Link href={PRIVACY_PATH} className="underline underline-offset-2">
            politique de confidentialité
          </Link>
          ).
        </p>
      </Section>
    </LegalDoc>
  );
}
