// Conditions d'utilisation — page publique (sans connexion). URL déclarée à
// l'App Store (contrat de licence), à la Play Console et dans l'app mobile
// (EXPO_PUBLIC_TERMS_URL). Version : LEGAL.privacyPolicyVersion (même cycle).
import type { Metadata } from 'next';
import { LegalPage, Section } from '@/components/legal/LegalPage';
import { LEGAL, PRIVACY_PATH, SUPPORT_PATH } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation — THRIVE',
  description: 'Conditions d’utilisation de l’application THRIVE, abonnement « Le moment qui compte » inclus.',
};

export default function ConditionsPage() {
  return (
    <LegalPage
      title="Conditions d’utilisation"
      updated={LEGAL.privacyPolicyVersion}
      intro={
        <p>
          En créant un compte, vous acceptez les présentes conditions et la{' '}
          <a href={PRIVACY_PATH}>politique de confidentialité</a>.
        </p>
      }
    >
      <Section id="objet" title="1. Objet">
        <p>
          Les présentes conditions encadrent l’utilisation de l’application THRIVE (web et mobile), le
          « Service », exploitée par <strong>{LEGAL.company}</strong>, {LEGAL.city}. NEQ : {LEGAL.neq}.
          Adresse du siège : {LEGAL.address}.
        </p>
      </Section>

      <Section id="comptes" title="2. Comptes">
        <ul>
          <li>Le compte parent est réservé aux personnes majeures titulaires de l’autorité parentale ou tutrices de l’enfant inscrit.</li>
          <li>Les comptes coach sont créés ou validés par THRIVE et soumis aux conditions applicables aux coachs.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe et des renseignements que vous fournissez.</li>
        </ul>
      </Section>

      <Section id="service" title="3. Le Service">
        <p>
          THRIVE propose un programme psychoéducatif par le sport (13 séances), des bilans, une messagerie
          avec le coach assigné et des activités à faire en famille. Certaines fonctions sont réservées aux
          abonnés ou aux familles accompagnées.
        </p>
      </Section>

      <Section id="abonnement" title="4. Abonnement « Le moment qui compte »">
        <ul>
          <li>
            <strong>Formules :</strong> mensuelle ou annuelle. Le prix est affiché avant l’achat ; les taxes
            applicables sont indiquées au moment du paiement.
          </li>
          <li>
            <strong>Essai gratuit :</strong> 1 mois, une seule fois par compte. Sauf annulation avant la fin de
            l’essai, l’abonnement payant commence automatiquement.
          </li>
          <li>
            <strong>Renouvellement automatique :</strong> pour la même durée, au prix alors en vigueur, sauf
            annulation au moins 24 heures avant la fin de la période en cours (App Store) ou avant la date de
            renouvellement (Google Play, web).
          </li>
          <li>
            <strong>Gérer ou annuler :</strong> abonnement souscrit sur iPhone : Réglages › votre nom ›
            Abonnements. Sur Android : Google Play › Paiements et abonnements. Sur le web : Compte › Abonnement
            › Gérer (portail sécurisé de Stripe).
          </li>
          <li>
            <strong>Effet de l’annulation :</strong> l’accès est maintenu jusqu’à la fin de la période payée ;
            aucun remboursement au prorata, sauf si la loi l’exige.
          </li>
          <li>
            <strong>Remboursements :</strong> pour un achat App Store ou Google Play, la demande se fait auprès
            d’Apple ou de Google selon leurs politiques. Pour un achat web, écrivez à{' '}
            <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. Les droits prévus par la Loi sur
            la protection du consommateur ne sont pas limités par les présentes.
          </li>
          <li>
            <strong>Changement de prix :</strong> annoncé à l’avance ; le nouveau prix s’applique au
            renouvellement suivant, et vous pouvez annuler.
          </li>
          <li>
            Un abonnement pris sur une plateforme est reconnu sur les autres avec le même compte. La suppression
            du compte n’annule pas un abonnement App Store ou Google Play.
          </li>
        </ul>
      </Section>

      <Section id="conduite" title="5. Règles de conduite">
        <p>
          Il est interdit d’utiliser la messagerie pour harceler, menacer ou tenir des propos haineux ou
          inappropriés, de partager un contenu illicite, d’usurper une identité, de tenter d’accéder aux données
          d’une autre famille, ou de copier ou revendre les contenus. Dans l’application, un appui long sur un message permet de le signaler ou de bloquer la conversation. Vous pouvez aussi signaler un message à{' '}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. Les signalements sont traités dans
          un délai de 24 heures ouvrables ; un compte peut être suspendu.
        </p>
      </Section>

      <Section id="propriete" title="6. Contenus et propriété intellectuelle">
        <p>
          Les contenus du Service (textes, séances, vidéos, illustrations, questionnaires, marque THRIVE)
          appartiennent à THRIVE ou à ses concédants. Vous recevez une licence personnelle, non exclusive et non
          transférable, pour un usage familial. Les échelles LSSS et EPOCH demeurent la propriété de leurs
          auteurs.
        </p>
      </Section>

      <Section id="vos-contenus" title="7. Vos contenus">
        <p>
          Vous restez titulaire des messages, photos et notes que vous publiez. Vous nous autorisez à les
          héberger et à les afficher aux personnes autorisées (coach, co-parents), uniquement pour fournir le
          Service.
        </p>
      </Section>

      <Section id="sante" title="8. Avertissement santé et sécurité">
        <p>
          <strong>THRIVE est un programme éducatif. Il ne remplace pas un avis, un diagnostic ou un traitement
          médical, psychologique ou psychosocial.</strong> Les scores et bilans sont des repères
          d’accompagnement, pas des évaluations cliniques.
        </p>
        <ul>
          <li>Avant une activité physique, assurez-vous que l’état de santé de votre enfant le permet ; en cas de doute, consultez un professionnel de la santé.</li>
          <li>Arrêtez toute activité en cas de douleur, de malaise ou de blessure.</li>
          <li>
            Inquiétude pour la santé mentale d’un jeune : Info-Social 811 (option 2), 9-8-8 (ligne d’aide en cas
            de crise suicidaire), Jeunesse, J’écoute 1 800 668-6868 ou texto 686868. <strong>En cas d’urgence,
            composez le 9-1-1.</strong>
          </li>
        </ul>
      </Section>

      <Section id="responsabilite" title="9. Responsabilité">
        <p>
          Le Service est fourni avec diligence, sans garantie d’absence d’interruption. Dans la mesure permise
          par la loi, THRIVE n’est pas responsable des dommages indirects ni des blessures survenant pendant des
          activités réalisées sans la supervision d’un adulte. Rien dans les présentes n’exclut une responsabilité
          qui ne peut l’être en vertu de la loi, notamment de la Loi sur la protection du consommateur.
        </p>
      </Section>

      <Section id="resiliation" title="10. Suspension et résiliation">
        <p>
          Vous pouvez supprimer votre compte à tout moment : Compte › « Supprimer mon compte et mes données »
          (détails dans la <a href={`${PRIVACY_PATH}#suppression`}>politique de confidentialité</a>). Nous pouvons
          suspendre un compte en cas de manquement grave, après avis sauf urgence.
        </p>
      </Section>

      <Section id="modifications" title="11. Modifications">
        <p>
          Nous vous informons de toute modification importante au moins 30 jours avant son entrée en vigueur. Si
          vous la refusez, vous pouvez résilier sans frais.
        </p>
      </Section>

      <Section id="droit" title="12. Droit applicable">
        <p>
          Les présentes sont régies par les lois du Québec et du Canada. Le consommateur domicilié au Québec
          conserve le droit de s’adresser aux tribunaux de son domicile.
        </p>
      </Section>

      <Section id="contact" title="13. Contact">
        <p>
          {LEGAL.company} · <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> ·{' '}
          <a href={SUPPORT_PATH}>Page Support</a>
        </p>
      </Section>

      <Section id="plateformes" title="14. Conditions des plateformes">
        <p>
          Pour les applications mobiles, le contrat de licence standard d’Apple et les conditions de Google Play
          s’appliquent également. Apple et Google ne sont pas parties aux présentes et n’ont aucune obligation
          d’assistance à l’égard du Service.
        </p>
      </Section>
    </LegalPage>
  );
}
