import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales — Mark Hachem Gallery. Éditeur, hébergeur et droit applicable.',
  alternates: { canonical: '/mentions-legales' },
  robots: { index: true, follow: true },
}

export default function MentionsLegalesPage() {
  return (
    <article className="legal-page">
      <h1>Mentions Légales</h1>

      <h2>Article 1 — Informations légales</h2>
      <p>
        Le site <strong>markhachem.com</strong> est édité par la <strong>SARL PLACE DES VOSGES</strong>,
        société à responsabilité limitée dont le siège social est situé au 28 Place des Vosges, 75003
        Paris, France, immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro RCS :
        448 331 975.
      </p>
      <p>
        Le directeur de la publication est <strong>Mark Hachem</strong>.
      </p>
      <p>
        Le site est hébergé par <strong>1&amp;1 IONOS SARL</strong>, 7 place de la Gare, BP 70109, 57200
        Sarreguemines Cedex, France.
      </p>
      <p>
        <strong>Utilisateur :</strong> toute personne naviguant, lisant ou utilisant de quelque manière
        que ce soit les contenus du site.
      </p>

      <h2>Article 2 — Accessibilité</h2>
      <p>
        Le site est accessible 24h/24 et 7j/7, sous réserve d&apos;éventuelles pannes ou opérations de
        maintenance, dont la durée et la fréquence ne peuvent être garanties. L&apos;éditeur ne saurait
        être tenu pour responsable d&apos;une indisponibilité temporaire ou définitive du site.
      </p>

      <h2>Article 3 — Loi applicable et juridiction</h2>
      <p>
        Le présent site est régi par le droit français. Tout litige relatif au site, à son contenu ou à
        son utilisation relève de la compétence exclusive des tribunaux français.
      </p>

      <h2>Article 4 — Contact</h2>
      <p>
        Pour signaler tout contenu illicite ou pour toute question relative aux présentes mentions
        légales, veuillez contacter l&apos;éditeur par courriel à l&apos;adresse suivante :{' '}
        <a href="mailto:paris@markhachem.com">paris@markhachem.com</a>.
      </p>
    </article>
  )
}
