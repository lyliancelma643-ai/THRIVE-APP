import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc, List, Section } from '@/components/legal/LegalDoc';
import { LEGAL_ENTITY, PRIVACY_CONTACT } from '@/lib/legal-entity';
import { TERMS_PATH } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — THRIVE',
  description: 'Comment THRIVE recueille, utilise, protège et supprime les renseignements personnels des familles.',
};

// Politique de confidentialité — rédigée à partir du traitement RÉEL constaté
// dans le code et la base (2026-10-02) : chaque catégorie de données, chaque
// prestataire et chaque durée correspond à une fonctionnalité existante.
// Toute nouvelle collecte ou tout nouveau prestataire impose de la mettre à
// jour (et LEGAL_VERSION_DATE dans lib/legal-entity.ts).
// URL publique à déclarer : App Store Connect (Privacy Policy URL) et
// Google Play Console (politique de confidentialité ; suppression : #suppression).

const PROCESSORS: { name: string; role: string; place: string }[] = [
  { name: 'Supabase', role: 'Base de données, comptes, stockage des photos et documents, fonctions serveur', place: 'Canada (région ca-central-1, Montréal)' },
  { name: 'Vercel', role: 'Hébergement et diffusion de l’application web', place: 'États-Unis et réseau mondial de diffusion' },
  { name: 'Stripe', role: 'Paiement de l’abonnement sur le web (carte bancaire, factures)', place: 'États-Unis, Irlande' },
  { name: 'RevenueCat', role: 'Gestion de l’état de l’abonnement (web, iPhone, Android)', place: 'États-Unis' },
  { name: 'Apple, Google', role: 'Achats intégrés (App Store, Google Play) et acheminement des notifications', place: 'États-Unis' },
  { name: 'Wistia', role: 'Lecture des vidéos des séances', place: 'États-Unis' },
  { name: 'Sentry', role: 'Détection des erreurs techniques (message d’erreur, écran concerné, type d’appareil et de navigateur)', place: 'États-Unis' },
];

// Synthèse alignée sur les fiches « Confidentialité de l'app » (Apple) et
// « Sécurité des données » (Google Play).
const STORE_SUMMARY: { data: string; purpose: string; linked: string }[] = [
  { data: 'Nom, adresse courriel, téléphone (facultatif)', purpose: 'Compte, support', linked: 'Oui' },
  { data: 'Profil de l’enfant (prénom, nom, âge, sport, photo facultative)', purpose: 'Fonctionnement du service', linked: 'Oui' },
  { data: 'Questionnaires de bien-être et compétences de vie', purpose: 'Fonctionnement du service', linked: 'Oui' },
  { data: 'Messages et contenus ajoutés (carnet, photos)', purpose: 'Fonctionnement du service', linked: 'Oui' },
  { data: 'Historique d’achat (statut de l’abonnement)', purpose: 'Facturation', linked: 'Oui' },
  { data: 'Diagnostics (rapports d’erreur)', purpose: 'Fiabilité de l’app', linked: 'Non' },
];

export default function ConfidentialitePage() {
  const company = LEGAL_ENTITY.legalName
    ? `${LEGAL_ENTITY.legalName}, qui exploite ${LEGAL_ENTITY.brand}`
    : LEGAL_ENTITY.brand;
  return (
    <LegalDoc
      title="Politique de confidentialité"
      intro={
        <p>
          THRIVE accompagne des jeunes de 8 à 17 ans et leurs parents. Leurs renseignements sont
          confiés à <strong>{company}</strong> (« THRIVE », « nous »). Cette politique explique, en
          termes simples, ce que nous recueillons, pourquoi, avec qui nous le partageons, combien de
          temps nous le gardons et comment exercer vos droits. Elle applique la{' '}
          <em>Loi sur la protection des renseignements personnels dans le secteur privé</em> du
          Québec (Loi 25) et, pour les familles qui résident dans l’Union européenne, le Règlement
          général sur la protection des données (RGPD). Elle vaut pour l’application web
          ({LEGAL_ENTITY.appUrl.replace('https://', '')}) et pour les applications iPhone et Android.
        </p>
      }
    >
      <Section id="responsable" title="1. Responsable de la protection des renseignements personnels">
        <p>
          {PRIVACY_CONTACT.officer ? (
            <>
              <strong>{PRIVACY_CONTACT.officer}</strong>, {PRIVACY_CONTACT.title}.
            </>
          ) : (
            <>
              Conformément à la Loi 25, la personne ayant la plus haute autorité au sein de THRIVE
              exerce la fonction de responsable de la protection des renseignements personnels.
            </>
          )}{' '}
          Elle veille au respect de la présente politique et répond à toute question, demande ou
          plainte relative à vos renseignements.
        </p>
        <p>
          Pour la joindre : {PRIVACY_CONTACT.channel}
          {PRIVACY_CONTACT.email ? <>, ou par courriel à {PRIVACY_CONTACT.email}</> : null}
          {LEGAL_ENTITY.address ? <>, ou par la poste : {LEGAL_ENTITY.address}</> : null}. Indiquez
          « Renseignements personnels » au début de votre message : il est traité en priorité.
        </p>
      </Section>

      <Section id="recueil" title="2. Renseignements recueillis">
        <p>Nous ne recueillons que ce qui est nécessaire au service que vous avez choisi.</p>
        <List
          items={[
            <><strong>Compte parent</strong> : prénom, nom, adresse courriel, mot de passe (chiffré, jamais lisible par nous), téléphone si vous le donnez, rôle dans la famille.</>,
            <><strong>Profil de l’enfant</strong>, saisi par le parent : prénom, nom, date de naissance (calculée à partir de l’âge), genre (facultatif), sport, notes facultatives (par exemple une allergie ou un besoin particulier), photo, surnom, numéro de maillot et couleur (facultatifs).</>,
            <><strong>Suivi du parcours</strong> : séances avec le coach, observations, objectifs, émotions nommées, routines, prochaines étapes, bilans, lettre et certificat, documents partagés par le coach.</>,
            <><strong>Questionnaires de l’enfant</strong> : réponses aux échelles LSSS (compétences de vie dans le sport) et EPOCH (bien-être). Ces réponses décrivent le bien-être psychologique du jeune : ce sont des <strong>renseignements sensibles</strong>, recueillis avec le consentement exprès du parent.</>,
            <><strong>Programme Maison</strong> : activités réalisées, durée, lieu, ressentis et réponses facultatives notés après l’activité, carnet des moments, lettres à ouvrir plus tard, récompenses obtenues.</>,
            <><strong>Messagerie</strong> : messages et pièces jointes échangés avec le coach et le support THRIVE.</>,
            <><strong>Abonnement</strong> : formule, statut, dates de renouvellement, plateforme d’achat. Le numéro de carte est saisi directement chez Stripe, Apple ou Google : THRIVE ne le voit ni ne le conserve.</>,
            <><strong>Données techniques</strong> : jeton de session, abonnement aux notifications (si vous l’activez), journal des actions sensibles (sécurité), rapports d’erreur techniques.</>,
          ]}
        />
        <p>
          Nous ne recueillons <strong>ni</strong> localisation, <strong>ni</strong> contacts du
          téléphone, <strong>ni</strong> identifiant publicitaire. L’app ne demande qu’une
          permission : les notifications, uniquement si vous l’acceptez. Une photo n’est envoyée que
          si vous la choisissez vous-même.
        </p>
        <p>
          L’enfant n’a <strong>pas de compte</strong> : il répond à ses questionnaires par un lien
          unique, à durée limitée, transmis à sa famille. Nous ne recueillons aucun renseignement
          auprès d’un enfant de moins de 14 ans sans le consentement du titulaire de l’autorité
          parentale. L’application s’adresse aux parents, qui en sont les utilisateurs.
        </p>
      </Section>

      <Section id="fins" title="3. Pourquoi nous les utilisons">
        <List
          items={[
            'Fournir le parcours THRIVE : séances avec le coach, bilans, Passeport athlète, questionnaires, programme Maison, messagerie.',
            'Mesurer la progression de l’enfant et la présenter au parent et au coach assigné.',
            'Gérer le compte, l’abonnement, la facturation et le support.',
            'Assurer la sécurité du service (contrôle des accès, détection d’abus et d’erreurs).',
            'Respecter nos obligations légales (comptabilité, réponse aux autorités compétentes).',
          ]}
        />
        <p>
          Nous ne vendons aucun renseignement, ne faisons aucune publicité ciblée, ne pratiquons
          aucun suivi entre applications ou sites tiers et n’utilisons pas les données des enfants à
          des fins commerciales ou d’entraînement d’intelligence artificielle.
        </p>
      </Section>

      <Section id="personnalisation" title="4. Personnalisation du programme Maison">
        <p>
          Le programme Maison propose chaque jour une activité choisie selon la tranche d’âge de
          l’enfant, la semaine du programme et les appréciations que vous laissez après chaque
          activité (une activité appréciée revient plus tôt, une activité peu appréciée ne revient
          pas). Cette personnalisation se fait selon des règles simples, dans l’app ; elle ne
          produit aucune décision ayant un effet juridique ou important pour vous ou votre enfant.
          Si vous ne souhaitez pas qu’elle s’applique, ne notez pas les activités ou écrivez-nous.
        </p>
      </Section>

      <Section id="consentement" title="5. Consentement">
        <p>
          À l’inscription, le parent coche une case par laquelle il accepte les conditions
          d’utilisation et la présente politique et consent, comme titulaire de l’autorité
          parentale, à la collecte décrite ci-dessus, y compris celle des renseignements sensibles de
          son enfant (questionnaires de bien-être). Ce consentement est enregistré avec sa date et la
          version des documents. Un jeune de 14 ans et plus peut aussi exercer lui-même les droits
          décrits à la section 9.
        </p>
        <p>
          Vous pouvez retirer votre consentement à tout moment en écrivant au responsable
          (section 1) ; certaines fonctions ne pourront alors plus être offertes (par exemple, sans
          questionnaires, la courbe de bien-être reste vide). Les notifications se désactivent à
          tout moment dans <strong>Compte</strong> ou dans les réglages du téléphone.
        </p>
        <p>
          Pour les familles de l’Union européenne, les bases légales sont l’exécution du contrat
          (service, abonnement), le consentement (renseignements sensibles, notifications),
          l’obligation légale (comptabilité) et l’intérêt légitime (sécurité du service).
        </p>
      </Section>

      <Section id="acces" title="6. Qui y a accès">
        <List
          items={[
            'Les parents de la famille (titulaire du compte et co-parent invité), pour leurs propres enfants seulement.',
            'Le coach assigné à l’enfant, pour les données de cet enfant.',
            'Les membres autorisés de l’équipe THRIVE (supervision, support, administration), selon leurs fonctions.',
          ]}
        />
        <p>
          Ces règles sont appliquées par la base de données elle-même, et pas seulement par
          l’affichage. Les photos et documents sont dans un stockage privé et ne s’ouvrent que par
          des liens temporaires.
        </p>
      </Section>

      <Section id="prestataires" title="7. Prestataires et communication hors du Québec">
        <p>
          Nous faisons appel aux prestataires suivants, liés par contrat à la confidentialité et à
          la sécurité, qui n’utilisent les renseignements que pour nous rendre le service :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-navy-100">
                <th className="py-2 pr-3">Prestataire</th>
                <th className="py-2 pr-3">Rôle</th>
                <th className="py-2">Lieu</th>
              </tr>
            </thead>
            <tbody>
              {PROCESSORS.map((p) => (
                <tr key={p.name} className="border-b border-navy-50 align-top">
                  <td className="py-2 pr-3 font-semibold">{p.name}</td>
                  <td className="py-2 pr-3">{p.role}</td>
                  <td className="py-2">{p.place}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Les données du parcours (profils, bilans, questionnaires, messages, Maison) sont
          conservées au Canada. Certains prestataires traitent des renseignements à l’extérieur du
          Québec : avant de leur communiquer des renseignements, nous évaluons les facteurs relatifs
          à la vie privée et nous assurons, par contrat, une protection adéquate. Nous ne
          communiquons aucun renseignement à d’autres tiers sans votre consentement, sauf lorsque
          la loi l’exige.
        </p>
      </Section>

      <Section id="conservation" title="8. Durée de conservation">
        <List
          items={[
            'Compte et données du parcours : tant que le compte est actif.',
            'Suppression demandée : effacement au plus tard 30 jours après la demande (section 10).',
            'Registre des demandes de suppression traitées : 12 mois, pour démontrer leur traitement.',
            'Factures : conservées par notre prestataire de paiement pendant la durée exigée par les lois fiscales.',
            'Copies de sauvegarde : effacées au fil de leur rotation automatique par notre hébergeur.',
            'Sur votre appareil : préférences d’affichage, brouillon d’un questionnaire en cours (effacé à l’envoi) et activités Maison enregistrées sans connexion. Vous pouvez les effacer à tout moment en supprimant les données du site ou de l’app sur votre appareil.',
          ]}
        />
      </Section>

      <Section id="droits" title="9. Vos droits">
        <p>Vous pouvez à tout moment :</p>
        <List
          items={[
            <>accéder à vos renseignements et à ceux de votre enfant, et en obtenir une copie dans un format structuré et couramment utilisé — directement dans l’app : <strong>Compte › Télécharger mes données</strong> ;</>,
            'faire corriger un renseignement inexact, incomplet ou équivoque ;',
            'retirer votre consentement ;',
            'demander que cesse la diffusion d’un renseignement ou sa désindexation ;',
            <>faire supprimer votre compte et les données de votre famille (section 10).</>,
          ]}
        />
        <p>
          Nous répondons par écrit au plus tard <strong>30 jours</strong> après la réception de
          votre demande. Si vous n’êtes pas satisfait de notre réponse, vous pouvez vous adresser à
          la{' '}
          <a href="https://www.cai.gouv.qc.ca" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            Commission d’accès à l’information du Québec
          </a>{' '}
          ou, dans l’Union européenne, à l’autorité de protection des données de votre pays (en
          France, la{' '}
          <a href="https://www.cnil.fr" className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
            CNIL
          </a>
          ).
        </p>
      </Section>

      <Section id="suppression" title="10. Supprimer votre compte et vos données">
        <p>Trois façons, au choix, sans avoir à réinstaller l’application :</p>
        <List
          items={[
            <>dans l’application iPhone, Android ou web : <strong>Compte › Supprimer mon compte</strong> ;</>,
            <>
              sur le web, depuis n’importe quel appareil :{' '}
              <Link href="/parent/compte" className="underline underline-offset-2">
                {LEGAL_ENTITY.appUrl.replace('https://', '')}/parent/compte
              </Link>{' '}
              après connexion, puis <strong>Supprimer mon compte</strong> ;
            </>,
            <>en écrivant au responsable (section 1), si vous n’avez plus accès à votre compte.</>,
          ]}
        />
        <p>
          <strong>Ce qui est supprimé</strong> : le compte, les profils des enfants dont vous êtes
          titulaire, leurs séances, bilans, questionnaires, documents, photos, messages et activités
          Maison. Si vous êtes titulaire du compte famille, la famille entière est supprimée ; un
          co-parent garde son propre compte, sans accès aux enfants.
        </p>
        <p>
          <strong>Ce qui est conservé</strong> : les factures, chez notre prestataire de paiement,
          pour la durée exigée par les lois fiscales ; la trace de votre demande (adresse, dates),
          12 mois, pour prouver qu’elle a été traitée.
        </p>
        <p>
          <strong>Délai</strong> : au plus tard 30 jours après la demande ; nous vous confirmons la
          suppression par courriel. Un abonnement pris sur le web est arrêté avec le compte ; un
          abonnement pris sur iPhone ou Android s’annule depuis les réglages du téléphone.
        </p>
      </Section>

      <Section id="securite" title="11. Sécurité et incidents">
        <p>
          Connexions chiffrées (HTTPS), données chiffrées au repos chez notre hébergeur, accès
          limités par rôle et vérifiés dans la base de données, double authentification offerte à
          l’équipe d’administration, journal des actions sensibles. En cas d’incident de
          confidentialité présentant un risque de préjudice sérieux, nous avisons sans délai la
          Commission d’accès à l’information et les personnes concernées, et nous tenons un registre
          de ces incidents.
        </p>
      </Section>

      <Section id="temoins" title="12. Témoins et stockage local">
        <p>
          L’app n’utilise ni témoin publicitaire ni outil de mesure d’audience. Elle utilise
          uniquement un témoin de session nécessaire à la connexion et le stockage local de votre
          appareil pour les préférences et les brouillons décrits à la section 8.
        </p>
      </Section>

      <Section id="stores" title="13. En résumé (fiches App Store et Google Play)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b border-navy-100">
                <th className="py-2 pr-3">Données</th>
                <th className="py-2 pr-3">Usage</th>
                <th className="py-2">Liées au compte</th>
              </tr>
            </thead>
            <tbody>
              {STORE_SUMMARY.map((r) => (
                <tr key={r.data} className="border-b border-navy-50 align-top">
                  <td className="py-2 pr-3">{r.data}</td>
                  <td className="py-2 pr-3">{r.purpose}</td>
                  <td className="py-2">{r.linked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Aucune donnée n’est utilisée pour le suivi publicitaire ni vendue. Toutes les données sont
          chiffrées en transit. Vous pouvez demander leur suppression (section 10).
        </p>
      </Section>

      <Section id="changements" title="14. Modifications">
        <p>
          Nous vous informerons dans l’app et par courriel de toute modification importante avant
          son entrée en vigueur. La date en haut de cette page indique la version en vigueur. Les
          conditions d’utilisation du service sont décrites{' '}
          <Link href={TERMS_PATH} className="underline underline-offset-2">ici</Link>.
        </p>
      </Section>
    </LegalDoc>
  );
}
